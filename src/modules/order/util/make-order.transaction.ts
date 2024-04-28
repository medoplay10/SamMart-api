import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseTransaction } from 'src/core/base/database/base.transaction';
import { jwtSignOptions } from 'src/core/setups/jwt.setup';
import { Otp } from 'src/infrastructure/entities/auth/otp.entity';
import { UserService } from 'src/modules/user/user.service';
import { DataSource, EntityManager, UpdateResult } from 'typeorm';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { UserInfoResponse } from 'src/modules/user/dto/responses/profile.response';
import { MakeOrderRequest } from '../dto/request/make-order-request';
import { Order } from 'src/infrastructure/entities/order/order.entity';
import { Warehouse } from 'src/infrastructure/entities/warehouse/warehouse.entity';
import { Address } from 'src/infrastructure/entities/user/address.entity';

import { Cart } from 'src/infrastructure/entities/cart/cart.entity';
import { CartProduct } from 'src/infrastructure/entities/cart/cart-products';
import { plainToInstance } from 'class-transformer';
import { Shipment } from 'src/infrastructure/entities/order/shipment.entity';
import { ShipmentProduct } from 'src/infrastructure/entities/order/shipment-product.entity';
import { WarehouseOperations } from 'src/infrastructure/entities/warehouse/warehouse-opreations.entity';
import { operationType } from 'src/infrastructure/data/enums/operation-type.enum';
import { WarehouseProducts } from 'src/infrastructure/entities/warehouse/warehouse-products.entity';
import { DeliveryType } from 'src/infrastructure/data/enums/delivery-type.enum';
import { Section } from 'src/infrastructure/entities/section/section.entity';
import { Slot } from 'src/infrastructure/entities/order/slot.entity';
import { ProductOffer } from 'src/infrastructure/entities/product/product-offer.entity';
import { ShipmentStatusEnum } from 'src/infrastructure/data/enums/shipment_status.enum';
import { WarehouseOpreationProducts } from 'src/infrastructure/entities/warehouse/wahouse-opreation-products.entity';
import { OrderGateway } from 'src/integration/gateways/order.gateway';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationEntity } from 'src/infrastructure/entities/notification/notification.entity';
import { NotificationTypes } from 'src/infrastructure/data/enums/notification-types.enum';
import { Driver } from 'src/infrastructure/entities/driver/driver.entity';
import { PaymentMethodEnum } from 'src/infrastructure/data/enums/payment-method';
import { PaymentMethod } from 'src/infrastructure/entities/payment_method/payment_method.entity';
import { PaymentMethodService } from 'src/modules/payment_method/payment_method.service';
import { PromoCodeService } from 'src/modules/promo-code/promo-code.service';
@Injectable()
export class MakeOrderTransaction extends BaseTransaction<
  MakeOrderRequest,
  Order
> {
  constructor(
    dataSource: DataSource,
    @Inject(REQUEST) readonly request: Request,
    private readonly orderGateway: OrderGateway,
    private readonly notificationService: NotificationService,
    private readonly paymentService: PaymentMethodService,
    private readonly promoCodeService: PromoCodeService,
  ) {
    super(dataSource);
  }

  // the important thing here is to use the manager that we've created in the base class
  protected async execute(
    req: MakeOrderRequest,
    context: EntityManager,
  ): Promise<Order> {
    try {
      const section = await context.findOne(Section, {
        where: { id: req.section_id },
      });
      if (!section.delivery_type.includes(req.delivery_type)) {
        throw new BadRequestException(
          'message.section_does_not_support_this_type_of_delivery',
        );
      }

      const user = this.request.user;
      const address = await context.findOne(Address, {
        where: [{ is_favorite: true, user_id: user.id }],
      });
      if (!address) {
        throw new BadRequestException(
          'message.user_does_not_have_a_default_address',
        );
      }
      const cart = await context.findOne(Cart, { where: { user_id: user.id } });

      const cart_products = await context.find(CartProduct, {
        where: { cart_id: cart.id, section_id: req.section_id },
      });
      if (cart_products.length == 0) {
        throw new BadRequestException('message.cart_is_empty');
      }
      const payment_method = await context.findOne(PaymentMethod, {
        where: {
          id: req.payment_method.payment_method_id,
          is_active: true,
        },
      });

      const count = await context
        .createQueryBuilder(Order, 'order')
        .where('DATE(order.created_at) = CURDATE()')
        .getCount();

      const order = await context.save(Order, {
        ...plainToInstance(Order, req),
        user_id: user.id,
        warehouse_id: cart_products[0].warehouse_id,
        delivery_fee: section.delivery_price,
        number: generateOrderNumber(count),
        address_id: address.id,
        is_paid: payment_method.type != PaymentMethodEnum.CASH ? true : false,
        payment_method: payment_method.type,
        payment_method_id: req.payment_method.payment_method_id,
        transaction_number:
          payment_method.type == PaymentMethodEnum.CASH
            ? null
            : req.payment_method.transaction_number,
      });

      if (order.delivery_type == DeliveryType.FAST) {
        const currentDate = new Date();

        // Add 40 minutes
        currentDate.setMinutes(currentDate.getMinutes() + 40);
        order.delivery_day = currentDate.toISOString().slice(0, 10);
        order.estimated_delivery_time = currentDate;
      } else {
        order.delivery_day = req.slot_day.day;
        order.slot_id = req.slot_day.slot_id;
        const slot = await context.findOne(Slot, {
          where: { id: req.slot_day.slot_id },
        });
        order.estimated_delivery_time = new Date(
          req.slot_day.day + 'T' + slot.start_time,
        );
      }

      const shipment = await context.save(Shipment, {
        order_id: order.id,
        warehouse_id: cart_products[0].warehouse_id,
      });

      const shipment_products = await Promise.all(
        cart_products.map(async (e) => {
          //handling offer
          if (e.is_offer == true) {
            const product_offer = await context.findOne(ProductOffer, {
              where: { product_category_price_id: e.product_category_price_id },
            });
            if (
              product_offer.offer_quantity - e.quantity < 0 ||
              product_offer.end_date < new Date()
            ) {
              throw new BadRequestException('offer is not available');
            }
            product_offer.offer_quantity =
              product_offer.offer_quantity - e.quantity;
            await context.save(product_offer);
          }

          return new ShipmentProduct({
            shipment_id: shipment.id,
            ...e,
            created_at: new Date(),
          });
        }),
      );
      await context.save(shipment_products);
      order.total_price = shipment_products.reduce(
        (a, b) => a + b.price * b.quantity,
        0,
      );
      if (order.total_price < section.min_order_price) {
        throw new BadRequestException(
          'message.total_price_is_less_than_min_order_price',
        );
      }

      let total = Number(order.total_price) + Number(order.delivery_fee);
      if (req.promo_code) {
        const promo_code = await this.promoCodeService.getValidPromoCodeByCode(
          req.promo_code,
        );
        if (promo_code) {
          total -= promo_code.discount;
          order.total_price = total;
        }
      }
      if (payment_method.type == PaymentMethodEnum.JAWALI) {
        const make_payment = await this.paymentService.jawalicashOut(
          req.payment_method.transaction_number,
          req.payment_method.wallet_number,
          total,
        );
        if (!make_payment) {
          throw new BadRequestException('payment failed');
        }
      }

      await context.save(Order, order);
      await context.delete(CartProduct, cart_products);

      //warehouse opreation
      const warehouse_operations = await context.save(
        WarehouseOperations,
        new WarehouseOperations({
          type: operationType.SELL,
          user_id: user.id,
          warehouse_id: cart_products[0].warehouse_id,
        }),
      );
      for (let index = 0; index < shipment_products.length; index++) {
        const warehouse_product = await context.findOne(WarehouseProducts, {
          where: {
            warehouse_id: cart_products[0].warehouse_id,
            product_id: shipment_products[index].product_id,
          },
        });
        if (!warehouse_product) {
          throw new BadRequestException(
            'message.warehouse_product_not_enough' + index,
          );
        }
        warehouse_product.quantity =
          warehouse_product.quantity -
          shipment_products[index].quantity *
            shipment_products[index].conversion_factor;
        if (warehouse_product.quantity < 0) {
          throw new BadRequestException(
            'message.warehouse_product_not_enough' + index,
          );
        }
        await context.save(warehouse_product);
        await context.save(
          WarehouseOpreationProducts,
          new WarehouseOpreationProducts({
            product_id: shipment_products[index].product_id,
            operation_id: warehouse_operations.id,

            product_measurement_id:
              shipment_products[index].main_measurement_id,
            quantity:
              -shipment_products[index].quantity *
              shipment_products[index].conversion_factor,
          }),
        );
      }

      let to_rooms = ['admin'];
      if (order.delivery_type == DeliveryType.FAST)
        to_rooms.push(shipment.warehouse_id);

      const warehouse = await context.findOne(Warehouse, {
        where: { id: shipment.warehouse_id },
      });
      order.address = address;

      await this.orderGateway.notifyOrderStatusChange({
        action: ShipmentStatusEnum.PENDING,
        to_rooms,
        body: {
          shipment: shipment,
          order: order,
          warehouse,
          client: user,
          driver: null,
        },
      });
      const driversWarehouse = await context.find(Driver, {
        where: {
          warehouse_id: shipment.warehouse_id,
        },
      });
      for (let index = 0; index < driversWarehouse.length; index++) {
        await this.notificationService.create(
          new NotificationEntity({
            user_id: driversWarehouse[index].user_id,
            url: shipment.id,
            type: NotificationTypes.ORDERS,
            title_ar: 'طلب جديد',
            title_en: 'new order',
            text_ar: 'هل تريد اخذ هذا الطلب ؟',
            text_en: 'Do you want to take this order?',
          }),
        );
      }

      return order;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error);
    }
  }
}
export const generateOrderNumber = (count: number) => {
  // number of digits matches ##-**-@@-&&&&, where ## is 100 - the year last 2 digits, ** is 100 - the month, @@ is 100 - the day, &&&& is the number of the order in that day
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  // order number is the count of orders created today + 1 with 4 digits and leading zeros
  const orderNumber = (count + 1).toString().padStart(4, '0');
  return `${100 - parseInt(year)}${100 - parseInt(month)}${
    100 - parseInt(day)
  }${orderNumber}`;
};
