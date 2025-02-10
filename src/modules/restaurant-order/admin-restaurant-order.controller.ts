import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RestaurantOrderService } from './restaurant-order.service';
import { MakeRestaurantOrderRequest } from './dto/request/make-restaurant-order.request';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { Roles } from '../authentication/guards/roles.decorator';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { plainToInstance } from 'class-transformer';
import { ActionResponse } from 'src/core/base/responses/action.response';
import { RestaurantOrderListResponse } from './dto/response/restaurant-order-list.response';
import { I18nResponse } from 'src/core/helpers/i18n.helper';
import { PaginatedRequest } from 'src/core/base/requests/paginated.request';
import { PaginatedResponse } from 'src/core/base/responses/paginated.response';
import { GetDriverRestaurantOrdersQuery } from './dto/query/get-driver-restaurant-order.query';
import { applyQueryIncludes } from 'src/core/helpers/service-related.helper';
@ApiBearerAuth()
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Language header: en, ar',
})
@ApiTags('Restaurant-Order')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('restaurant-order')
export class AdminRestaurantOrderController {
    constructor(private readonly restaurantOrderService: RestaurantOrderService
      ,@Inject(I18nResponse) private readonly _i18nResponse: I18nResponse
    ){}
  @Post('/admin/confirm/:id')
  @Roles(Role.DRIVER)
  async confirmOrder(@Param('id') id:string){
    return new ActionResponse(await this.restaurantOrderService.confirmOrder(id));
  }
  @Get('/admin/all')
  @Roles(Role.ADMIN)
  async getRestaurantOrdersAdminRequests(@Query() query:PaginatedRequest){
    applyQueryIncludes(query,"payment_methods");
    applyQueryIncludes(query,"driver");
    applyQueryIncludes(query,"restaurant");
   const orders=await this.restaurantOrderService.findAll(query);
   const total=await this.restaurantOrderService.count(query);
   const response = this._i18nResponse.entity(orders);
   const result=plainToInstance(RestaurantOrderListResponse,response,{
    excludeExtraneousValues: true,
  })
  return new PaginatedResponse(result,{
    meta:{
      total,
      ...query
    }
  });
}}
