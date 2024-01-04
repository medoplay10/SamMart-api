import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { I18nResponse } from 'src/core/helpers/i18n.helper';
import { CreateProductRequest } from './dto/request/create-product.request';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ActionResponse } from 'src/core/base/responses/action.response';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { plainToClass } from 'class-transformer';
import { ProductResponse } from './dto/response/product.response';
import { UpdateProductRequest } from './dto/request/update-product.request';
import { UpdateProductMeasurementRequest } from './dto/request/update-product-measurement.request';
import { UpdateProductImageRequest } from './dto/request/update-product-image.request';
import { ProductFilter } from './dto/filter/product.filter';
@ApiBearerAuth()
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Language header: en, ar',
})
@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    @Inject(I18nResponse) private readonly _i18nResponse: I18nResponse,
  ) {}
  @Post('create-product')
  async createProduct(@Body() createProductRequest: CreateProductRequest) {
    const product = await this.productService.create(createProductRequest);
    const productResponse = plainToClass(ProductResponse, product);

    return new ActionResponse(this._i18nResponse.entity(productResponse));
  }
  @Put('update-product')
  async updateProduct(@Body() updateProductRequest: UpdateProductRequest) {
    const product = await this.productService.updateProduct(
      updateProductRequest,
    );
    const productResponse = plainToClass(ProductResponse, product);

    return new ActionResponse(this._i18nResponse.entity(productResponse));
  }
  @Put('update-product-measurement')
  async updateProductMeasurement(
    @Body() updateProductMeasurementRequest: UpdateProductMeasurementRequest,
  ) {
    const product = await this.productService.updateProductMeasurement(
      updateProductMeasurementRequest,
    );
    const productResponse = plainToClass(ProductResponse, product);
    return new ActionResponse(this._i18nResponse.entity(productResponse));
  }

  @Put('update-product-image')
  async updateProductImage(
    @Body() updateProductImageRequest: UpdateProductImageRequest,
  ) {
    const product = await this.productService.updateProductImage(
      updateProductImageRequest,
    );
    const productResponse = plainToClass(ProductResponse, product);
    return new ActionResponse(this._i18nResponse.entity(productResponse));
  }

  @Get('all-products')
  async allProducts(@Query() productFilter: ProductFilter) {
    const products = await this.productService.AllProduct(productFilter);
    const productsResponse = products.map((product) => {
      return plainToClass(ProductResponse, product);
    });
    return new ActionResponse(this._i18nResponse.entity(products));
  }

  @Get(':sub_category_id/all-products')
  async subCategoryAllProducts(
    @Query() productFilter: ProductFilter,
    @Param('sub_category_id') sub_category_id: string,
  ) {
    const products = await this.productService.subCategoryAllProducts(
      productFilter,
      sub_category_id,
    );
    const productsResponse = products.map((product) => {
      return plainToClass(ProductResponse, product);
    });
    return new ActionResponse(this._i18nResponse.entity(products));
  }

  @Get('single-product/:product_id')
  @ApiParam({ name: 'product_id', required: true, type: String })
  @ApiQuery({
    name: 'sub_category_id',
    required: false,
    type: String,
  })
  async singleProduct(
    @Param('product_id') id: string,
    @Query('sub_category_id') sub_category_id?: string,
  ) {
    const product = await this.productService.singleProduct(
      id,
      sub_category_id,
    );
    const productResponse = plainToClass(ProductResponse, product);

    return new ActionResponse(this._i18nResponse.entity(product));
  }

  @Delete('delete-Product/:product_id')
  async deleteProduct(@Param('product_id') id: string) {
    return await this.productService.deleteProduct(id);
  }

  @Delete('delete-Product-image/:product_id/:image_id')
  async deleteProductImage(
    @Param('product_id') product_id: string,
    @Param('image_id') image_id: string,
  ) {
    return await this.productService.deleteProductImage(product_id, image_id);
  }
  @Delete('delete-Product-measurement/:product_id/:measurement_id')
  async deleteProductMeasurement(
    @Param('product_id') product_id: string,
    @Param('measurement_id') measurement_id: string,
  ) {
    return await this.productService.deleteProductMeasurement(
      product_id,
      measurement_id,
    );
  }
}
