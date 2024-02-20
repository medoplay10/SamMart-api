import { ProductMeasurement } from 'src/infrastructure/entities/product/product-measurement.entity';
import { MeasurementUnitResponse } from 'src/modules/measurement-unit/dto/responses/measurement-unit.response';
import { ProductMeasurementResponse } from '../product-measurement.response';
import { ProductImagesResponse } from '../product-images.response';
import { ProductAdditionalServiceResponse } from '../product-additional-service.response';
import { Exclude, Expose, Transform, plainToClass } from 'class-transformer';
import { DiscountType } from 'src/infrastructure/data/enums/discount-type.enum';
import { ProductResponse } from '../product.response';
import { Console } from 'console';
import { ProductsNewResponse } from '../response-client/products-new.response';

@Exclude()
export class ProductOfferNewResponse {
  @Expose() readonly id: string;

  @Expose() readonly product_category_price_id: string;

  @Expose() readonly start_date: Date;

  @Expose() readonly end_date: Date;

  @Expose() readonly price: number;

  @Expose() readonly offer_quantity: number;

  @Expose() readonly min_offer_quantity: number;

  @Expose() readonly max_offer_quantity: number;

  @Expose() readonly discount_type: DiscountType;

  @Expose() readonly discount_value: number;

  @Expose() readonly is_active: boolean;

  @Transform(({ obj }) => {
    console.log(obj);
    return plainToClass(
      ProductsNewResponse,
      obj.product_category_price.product_sub_category.product,
    );
  })
  @Expose()
  readonly product: ProductsNewResponse;

  @Transform(({ obj }) => {
    console.log(obj);
    return plainToClass(
      ProductMeasurementResponse,
      obj.product_category_price.product_measurement,
    );
  })
  @Expose()
  readonly productMeasurement: ProductMeasurementResponse;

  @Transform(({ obj }) => {
    console.log(obj);
    return plainToClass(
      ProductAdditionalServiceResponse,
      obj.product_category_price.product_additional_services,
    );
  })
  @Expose()
  readonly productAdditionalService: ProductAdditionalServiceResponse;
}
