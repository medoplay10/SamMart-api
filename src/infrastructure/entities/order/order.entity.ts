import { OwnedEntity } from 'src/infrastructure/base/owned.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Address } from '../user/address.entity';
import { Section } from '../section/section.entity';
import { DeliveryType } from 'src/infrastructure/data/enums/delivery-type.enum';
import { User } from '../user/user.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { PaymentMethod } from 'src/infrastructure/data/enums/payment-method';

import { Slot } from './slot.entity';
import { Shipment } from './shipment.entity';
import { Transaction } from '../wallet/transaction.entity';
import { ReturnOrderRequest } from './return-order/return-order-request.entity';

@Entity()
export class Order extends OwnedEntity {
  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn()
  user: User;

  @OneToMany(() => Shipment, (shipment) => shipment.order)
  shipments: Shipment[];

  @OneToMany(() => Transaction, (transaction) => transaction.order)
  transactions: Transaction[];
  @ManyToOne(() => Warehouse, (warehouse) => warehouse.orders)
  @JoinColumn()
  warehouse: Warehouse;
  @Column()
  warehouse_id: string;

  @ManyToOne(() => Address, (address) => address.orders)
  @JoinColumn()
  address: Address;

  @Column()
  address_id: string;

  @ManyToOne(() => Section, (section) => section.orders)
  @JoinColumn()
  section: Section;

  @Column()
  section_id: string;

  @OneToMany(() => ReturnOrderRequest, (returnOrderRequest) => returnOrderRequest.order, { cascade: true })
  returnOrders: ReturnOrderRequest[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  delivery_fee: number;

  @Column()
  payment_method: PaymentMethod;

  @Column({ default: false })
  is_paid: boolean;

  @Column({ length: 10, unique: true })
  number: string;

  @Column()
  delivery_type: DeliveryType;

  @Column({ nullable: true })
  estimated_delivery_time: Date;

  @ManyToOne(() => Slot, (slot) => slot.orders)
  @JoinColumn()
  slot: Slot;

  @Column({ nullable: true })
  delivery_day: string;

  @Column({ nullable: true })
  slot_id: string;
}
