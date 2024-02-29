import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver } from 'src/infrastructure/entities/driver/driver.entity';
import { In, Not, Repository, UpdateResult } from 'typeorm';
import { UpdateDriverLocationRequest } from './requests/update-driver-location.request';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { UpdateDriverReceiveOrdersRequest } from './requests/update-driver-receive-orders';
import { DriverShipmentGateway } from 'src/integration/gateways/driver-shipment.gateway';
import { Gateways } from 'src/core/base/gateways';
import { Shipment } from 'src/infrastructure/entities/order/shipment.entity';
import { ShipmentStatusEnum } from 'src/infrastructure/data/enums/shipment_status.enum';
import { ShipmentDriverResponse } from '../order/dto/response/driver-response/shipment-driver.respnse';
import { plainToClass } from 'class-transformer';
import { I18nResponse } from 'src/core/helpers/i18n.helper';
@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Driver) private driverRepository: Repository<Driver>,
    @Inject(REQUEST) private readonly _request: Request,
    @Inject(DriverShipmentGateway)
    private driverShipmentGateway: DriverShipmentGateway,
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
    @Inject(I18nResponse) private readonly _i18nResponse: I18nResponse,
  ) { }

  async single(driver_id: string): Promise<Driver> {
    const driver = await this.driverRepository.findOne({
      where: { id: driver_id },
      relations: { user: true },
    });

    if (!driver) {
      throw new Error('message.driver_not_found');
    }
    return driver;
  }

  async myProfileDriver(): Promise<Driver> {
    const driver = await this.driverRepository.findOne({
      where: { user_id: this._request.user.id },
      relations: { user: true },
    });

    if (!driver) {
      throw new Error('message.driver_not_found');
    }
    return driver;
  }

  async all(warehouse_id?: string): Promise<Driver[]> {
    const dbQuery = {
      relations: { user: true },
    }

    if (warehouse_id) {
      dbQuery['where'] = { warehouse_id }
    }

    return await this.driverRepository.find(dbQuery);
  }

  async updateDriverLocation(
    updateDriverLocationRequest: UpdateDriverLocationRequest,
  ): Promise<UpdateResult> {
    const { latitude, longitude } = updateDriverLocationRequest;
    const update = await this.driverRepository.update(
      { user_id: this._request.user.id },
      {
        latitude,
        longitude,
      },
    );
    const driver_shipments = await this.shipmentRepository.find({
      where: {
        driver: {
          user_id: this._request.user.id,
        },
        status: Not(
          In([
            ShipmentStatusEnum.PENDING,
            ShipmentStatusEnum.DELIVERED,
            ShipmentStatusEnum.CANCELED,
          ]),
        ),
      },
      relations: {
        driver: true,
        order: true,
      },
    });
    this.driverShipmentGateway.broadcastLocationDriver(driver_shipments);
    return update;
  }

  async updateDriverStatus(
    updateDriverReceiveOrdersRequest: UpdateDriverReceiveOrdersRequest,
  ): Promise<Driver> {
    const driver = await this.driverRepository.findOne({
      where: { user_id: this._request.user.id },
      relations: { user: true },
    });

    if (!driver) {
      throw new Error('message.driver_not_found');
    }
    await this.driverRepository.update(
      { id: driver.id },
      { is_receive_orders: updateDriverReceiveOrdersRequest.is_receive_orders },
    );

    return await this.driverRepository.findOne({
      where: { user_id: this._request.user.id },
      relations: { user: true },
    });
  }
}
