import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from 'src/infrastructure/entities/product/product.entity';
import {
  Between,
  Brackets,
  DeleteResult,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Like,
  Not,
  Repository,
} from 'typeorm';
import { CreateProductRequest } from './dto/request/create-product.request';
import { CreateProductTransaction } from './utils/create-product.transaction';
import { UpdateProductRequest } from './dto/request/update-product.request';
import { ProductImage } from 'src/infrastructure/entities/product/product-image.entity';
import { ProductMeasurement } from 'src/infrastructure/entities/product/product-measurement.entity';
import { UpdateProductMeasurementRequest } from './dto/request/update-product-measurement.request';
import { ProductsDashboardQuery } from './dto/filter/products-dashboard.query';
import { Subcategory } from 'src/infrastructure/entities/category/subcategory.entity';
import { ProductSubCategory } from 'src/infrastructure/entities/product/product-sub-category.entity';
import { SubcategoryService } from '../subcategory/subcategory.service';
import { MostHitSubcategory } from 'src/infrastructure/entities/category/most-hit-subcategory.entity';
import { ProductOffer } from 'src/infrastructure/entities/product/product-offer.entity';
import { CreateProductOfferRequest } from './dto/request/create-product-offer.request';
import { CategorySubCategory } from 'src/infrastructure/entities/category/category-subcategory.entity';
import { Warehouse } from 'src/infrastructure/entities/warehouse/warehouse.entity';
import { SingleProductRequest } from './dto/request/single-product.request';
import { Console, count } from 'console';
import { StorageManager } from 'src/integration/storage/storage.manager';
import * as sharp from 'sharp';
import { ImageManager } from 'src/integration/sharp/image.manager';
import { CreateProductImageRequest } from './dto/request/product-images/create-product-image.request';
import { CreateSingleImageRequest } from './dto/request/product-images/create-single-image.request';
import { UpdateSingleImageRequest } from './dto/request/product-images/update-single-image.request';
import { CreateProductMeasurementRequest } from './dto/request/create-product-measurement.request';
import { ProductClientQuery } from './dto/filter/products-client.query';
import { SingleProductClientQuery } from './dto/filter/single-product-client.query';
import { ProductCategoryPrice } from 'src/infrastructure/entities/product/product-category-price.entity';
import { DiscountType } from 'src/infrastructure/data/enums/discount-type.enum';
import { FileService } from '../file/file.service';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import * as fs from 'fs';
import {
  CreateProductExcelRequest,
  CreateProductsExcelRequest,
} from './dto/request/create-products-excel.request';
import { toUrl } from 'src/core/helpers/file.helper';
import { SingleProductDashboardQuery } from './dto/filter/single-product-dashboard.query';
import { UpdateProductOfferRequest } from './dto/request/update-product-offer.request';
import { NotificationService } from '../notification/notification.service';
import { SendToUsersNotificationRequest } from '../notification/dto/requests/send-to-users-notification.request';
import { User } from 'src/infrastructure/entities/user/user.entity';
import { WarehouseProducts } from 'src/infrastructure/entities/warehouse/warehouse-products.entity';
import { Section } from 'src/infrastructure/entities/section/section.entity';
import { Category } from 'src/infrastructure/entities/category/category.entity';
import { DeleteProductTransaction } from './utils/delete-product.transaction';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { ShipmentProduct } from 'src/infrastructure/entities/order/shipment-product.entity';
import { Brand } from 'src/infrastructure/entities/brand/brand';
import { Request } from 'express';
import {
  CreateBrandRequest,
  UpdateBrandRequest,
} from './dto/request/create-brand.request';
import { ShipmentStatusEnum } from 'src/infrastructure/data/enums/shipment_status.enum';
import { REQUEST } from '@nestjs/core';
import { ProductChanges } from 'src/infrastructure/entities/product/product-changes.entity';

@Injectable()
export class ProductDashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    @InjectRepository(ProductMeasurement)
    private readonly productMeasurementRepository: Repository<ProductMeasurement>,
    @InjectRepository(Subcategory)
    private subcategory_repo: Repository<Subcategory>,
    @InjectRepository(ProductOffer)
    private readonly productOfferRepository: Repository<ProductOffer>,
    @InjectRepository(CategorySubCategory)
    private readonly categorySubcategory_repo: Repository<CategorySubCategory>,
    @InjectRepository(MostHitSubcategory)
    private readonly mostHitSubcategoryRepository: Repository<MostHitSubcategory>,

    @InjectRepository(ProductSubCategory)
    private readonly productSubCategory_repo: Repository<ProductSubCategory>,

    @InjectRepository(ShipmentProduct)
    private readonly shipmentProduct_repo: Repository<ShipmentProduct>,

    @InjectRepository(ProductCategoryPrice)
    private readonly productCategoryPrice_repo: Repository<ProductCategoryPrice>,

    @InjectRepository(Brand)
    private readonly brand_repo: Repository<Brand>,

    @InjectRepository(ProductOffer)
    private productOffer_repo: Repository<ProductOffer>,

    @InjectRepository(Warehouse)
    private readonly warehouse_repo: Repository<Warehouse>,

    @InjectRepository(ProductChanges)
    private readonly product_changes_repo: Repository<ProductChanges>,

    @InjectRepository(WarehouseProducts)
    private readonly warehouse_products_repo: Repository<WarehouseProducts>,

    @Inject(CreateProductTransaction)
    private readonly addProductTransaction: CreateProductTransaction,

    @Inject(DeleteProductTransaction)
    private readonly deleteProductTransaction: DeleteProductTransaction,

    @Inject(SubcategoryService)
    private readonly subCategoryService: SubcategoryService,

    @Inject(StorageManager) private readonly storageManager: StorageManager,

    @Inject(ImageManager) private readonly imageManager: ImageManager,

    @Inject(REQUEST) private readonly request: Request,

    @Inject(FileService) private _fileService: FileService,
    private readonly notificationService: NotificationService,
  ) {}
  isArabic(text: string): boolean {
    return /[\u0600-\u06FF]/.test(text);
  }
  async createProduct(
    createProductRequest: CreateProductRequest,
  ): Promise<Product> {
    return await this.addProductTransaction.run(createProductRequest);
  }

  async createProductOffer(
    product_category_price_id: string,
    createProductOfferRequest: CreateProductOfferRequest,
  ) {
    const {
      max_offer_quantity,
      min_offer_quantity,
      end_date,
      start_date,
      order_by,
    } = createProductOfferRequest;
    if (max_offer_quantity < min_offer_quantity) {
      throw new BadRequestException(
        'message.max_offer_quantity_must_be_greater_than_min_offer_quantity',
      );
    }
    if (end_date < start_date) {
      throw new BadRequestException(
        'message.end_date_must_be_greater_than_start_date',
      );
    }
    if (order_by != null) {
      const highest_number = await this.productOffer_repo.count();

      if (order_by > highest_number + 1)
        throw new BadRequestException(
          'order_by must be smaller than ' + (highest_number + 1),
        );
      else if (order_by < 1)
        throw new BadRequestException('order_by must be greater than 1');
      const if_exist = await this.productOffer_repo.findOne({
        where: { order_by: order_by },
      });
      if (if_exist) {
        if_exist.order_by = order_by;
        await this.productOffer_repo.save(if_exist);
      }
    }

    const productCategoryPrice = await this.productCategoryPrice_repo.findOne({
      where: { id: product_category_price_id },
    });
    if (!productCategoryPrice) {
      throw new NotFoundException('message.product_category_price_not_found');
    }
    const productOffer = await this.productOffer_repo.findOne({
      where: { product_category_price_id: product_category_price_id },
    });
    if (productOffer) {
      throw new BadRequestException('message.product_offer_already_exist');
    }

    const createProductOffer = this.productOffer_repo.create(
      createProductOfferRequest,
    );

    createProductOffer.product_category_price_id = product_category_price_id;
    if (createProductOffer.discount_type == DiscountType.VALUE) {
      if (createProductOffer.discount_value >= productCategoryPrice.price) {
        throw new BadRequestException(
          'message.discount_value_must_be_less_than_product_price',
        );
      }
      createProductOffer.price =
        productCategoryPrice.price - createProductOffer.discount_value;
    } else {
      if (
        createProductOffer.discount_value >= 1 ||
        createProductOffer.discount_value < 0
      ) {
        throw new BadRequestException(
          'message.discount_value_must_be_between_0_and_1',
        );
      }

      const discountedPercentage =
        (productCategoryPrice.price * createProductOffer.discount_value) / 100;
      createProductOffer.price =
        productCategoryPrice.price - discountedPercentage;
    }
    const newOffer = await this.productOffer_repo.save(createProductOffer);

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.fcm_token IS NOT NULL')
      .andWhere('user.roles = :roles', { roles: Role.CLIENT })
      .getMany();
    // const sendToUsersNotificationRequest: SendToUsersNotificationRequest = {
    //   users_id: users.map((user) => user.id),
    //   title_ar: 'عروض',
    //   title_en: 'offers',
    //   message_ar: 'تم اضافة عرض جديد',
    //   message_en: 'new offer added',
    // };
    // await this.notificationService.sendToUsers(sendToUsersNotificationRequest);
    return newOffer;
  }
  async updateProductOffer(
    offer_id: string,
    updateProductOfferRequest: UpdateProductOfferRequest,
  ) {
    const {
      discount_type,
      discount_value,
      end_date,
      is_active,
      max_offer_quantity,
      min_offer_quantity,
      start_date,
      offer_quantity,
      order_by,
      description_ar,
      description_en,
    } = updateProductOfferRequest;
    const productOffer = await this.productOffer_repo.findOne({
      where: { id: offer_id },
      relations: { product_category_price: true },
    });
    let productOfferPrice = productOffer.price;

    if (!productOffer) {
      throw new NotFoundException('message.product_offer_not_found');
    }

    if (discount_type != undefined && discount_value != undefined) {
      if (discount_type == DiscountType.VALUE) {
        if (discount_value >= productOffer.product_category_price.price) {
          throw new BadRequestException(
            'message.discount_value_must_be_less_than_product_price',
          );
        }
        productOfferPrice =
          productOffer.product_category_price.price - discount_value;
      } else {
        if (discount_value >= 1) {
          throw new BadRequestException(
            'message.discount_value_must_be_less_than_1',
          );
        }
        const discountedPercentage =
          (productOffer.product_category_price.price * discount_value) / 100;
        productOfferPrice =
          productOffer.product_category_price.price - discountedPercentage;
      }
    }

    if (order_by != null) {
      const if_exist = await this.productOffer_repo.findOne({
        where: { order_by: order_by },
      });
      const highest_number = await this.productOffer_repo.count();
      if (order_by > highest_number + 1)
        throw new BadRequestException('order_by must be smaller than ' + count);
      else if (order_by < 1)
        throw new BadRequestException('order_by must be greater than 1');
      if (if_exist) {
        if_exist.order_by = order_by;
        await this.productOffer_repo.save(if_exist);
      }
    }

    await this.productOffer_repo.update(
      { id: offer_id },
      {
        discount_type,
        discount_value,
        end_date,
        start_date,
        order_by,
        is_active,
        max_offer_quantity,
        min_offer_quantity,
        price: productOfferPrice,
        offer_quantity,
        description_ar,
        description_en,
      },
    );
    return await this.productOffer_repo.findOne({
      where: { id: offer_id },
      relations: { product_category_price: true },
    });
  }
  async deleteProductOffer(product_id: string) {
    const productOffer = await this.productOffer_repo.findOne({
      where: { id: product_id },
    });
    if (!productOffer) {
      throw new NotFoundException('message.product_offer_not_found');
    }
    return await this.productOffer_repo.delete({ id: product_id });
  }

  async addProductImage(
    product_id: string,
    createSingleImageRequest: CreateSingleImageRequest,
  ) {
    const { file, is_logo } = createSingleImageRequest;
    const product = await this.productRepository.findOne({
      where: { id: product_id },
      relations: { product_images: true },
    });
    if (!product) {
      throw new NotFoundException('message.product_not_found');
    }

    const resizedImage = await this.imageManager.resize(file, {
      size: {},
      options: {
        fit: sharp.fit.cover,
        position: sharp.strategy.entropy,
      },
    });

    // save image
    const path = await this.storageManager.store(
      { buffer: resizedImage, originalname: file.originalname },
      { path: 'banners' },
    );

    const productImage = this.productImageRepository.create({
      product_id,
      is_logo,
      url: path,
    });

    const productImageSaved = await this.productImageRepository.save(
      productImage,
    );
    if (productImageSaved.is_logo) {
      for (let index = 0; index < product.product_images.length; index++) {
        if (product.product_images[index].is_logo == true) {
          await this.productImageRepository.update(
            product.product_images[index].id,
            {
              is_logo: false,
            },
          );
        }
      }
    }

    return productImageSaved;
  }

  async addProductMeasurement(
    product_id: string,
    createProductMeasurementRequest: CreateProductMeasurementRequest,
  ) {
    const { conversion_factor, is_main_unit, measurement_unit_id } =
      createProductMeasurementRequest;
    const product = await this.productRepository.findOne({
      where: { id: product_id },
    });
    if (!product) {
      throw new NotFoundException('message.product_not_found');
    }
    const productMeasurement = this.productMeasurementRepository.create({
      conversion_factor,
      is_main_unit,
      measurement_unit_id,
      product_id,
    });
    //* Set Main Unit
    if (!is_main_unit) {
      const mainProductMeasurement =
        await this.productMeasurementRepository.findOne({
          where: { product_id, is_main_unit: true },
        });
      productMeasurement.base_unit_id = mainProductMeasurement.id;
    }
    return await this.productMeasurementRepository.save(productMeasurement);
  }
  async updateProduct(
    product_id: string,
    updateProductRequest: UpdateProductRequest,
  ): Promise<Product> {
    const {
      description_ar,
      description_en,
      is_active,
      is_recovered,
      name_ar,
      name_en,
      barcode,
      keywords,
      row_number,
      brand_id,
      order_by_brand,
    } = updateProductRequest;

    //* Check if product exist
    const product = await this.productRepository.findOne({
      where: { id: product_id },
    });
    if (!product) {
      throw new NotFoundException('message.product_not_found');
    }
    //* Check if product barcode exist
    const productBarcode = await this.productRepository.findOne({
      where: { barcode, id: Not(product_id) },
    });
    if (productBarcode?.barcode == barcode) {
      throw new BadRequestException('message.product_barcode_exist');
    }

    await this.productRepository.update(
      { id: product_id },
      {
        is_active,
        is_recovered,
        name_en,
        name_ar,
        description_ar,
        description_en,
        barcode,
        keywords,
        row_number,
        brand_id,
        order_by_brand,
      },
    );
    const historyRecords = [];
    for (const [key, value] of Object.entries(updateProductRequest)) {
      if (product[key]?.toString() !== value?.toString()) {
        historyRecords.push({
          product: product,
          fieldChanged: key,
          oldValue: product[key]?.toString(),
          newValue: value.toString(),
          user_id: this.request.user.id,
        });
        product[key] = value;
      }
    }

    await this.productRepository.save(product);

    if (historyRecords.length) {
      await this.product_changes_repo.save(historyRecords);
    }

    return await this.productRepository.findOne({
      where: { id: product_id },
    });
  }

  async updateProductMeasurement(
    product_id: string,
    product_measurement_unit_id: string,
    updateProductMeasurementRequest: UpdateProductMeasurementRequest,
  ) {
    const { conversion_factor, is_main_unit, measurement_unit_id } =
      updateProductMeasurementRequest;

    // Check if the product exists
    const product = await this.productRepository.findOne({
      where: { id: product_id },
      relations: { product_measurements: true },
    });

    if (!product) {
      throw new NotFoundException('message.product_not_found');
    }

    // Check if the product measurement exists
    const productMeasurement = await this.productMeasurementRepository.findOne({
      where: { id: product_measurement_unit_id },
    });
    if (!productMeasurement) {
      throw new NotFoundException('message.product_measurement_not_found');
    }

    // Prepare the update data
    const updateData: any = {
      conversion_factor,
      is_main_unit,
      measurement_unit_id,
    };

    // If the unit is marked as the main unit, ensure the conversion factor is 1

    if (
      conversion_factor !== undefined &&
      conversion_factor !== null &&
      conversion_factor !== 1 &&
      is_main_unit == true
    ) {
      throw new BadRequestException(
        'message.conversion_factor_must_be_1_for_main_unit',
      );
    }

    // Update base unit logic
    // Check if `is_main_unit` is defined and not null
    if (is_main_unit !== undefined && is_main_unit !== null) {
      // If `is_main_unit` is true, set the `base_unit_id` to null
      // This indicates that this unit is the main unit and doesn't link to any other unit
      if (is_main_unit) {
        updateData.base_unit_id = null;
      } else {
        // If the unit is not the main unit, find the main unit for the product
        const mainProductMeasurement =
          await this.productMeasurementRepository.findOne({
            where: { product_id, is_main_unit: true },
          });

        // If a main unit doesn't exist, throw an error
        if (!mainProductMeasurement) {
          throw new NotFoundException(
            'message.main_product_measurement_not_found',
          );
        }

        // Link this unit to the found main unit by setting `base_unit_id` to the main unit's ID
        updateData.base_unit_id = mainProductMeasurement.id;
      }
    }

    // Perform the update and return the updated product measurement
    await this.productMeasurementRepository.update(
      { id: product_measurement_unit_id },
      updateData,
    );
    return await this.productMeasurementRepository.findOne({
      where: { id: product_measurement_unit_id },
    });
  }

  async updateProductImage(product_id: string, image_id: string) {
    //* Check if product exist
    const product = await this.productRepository.findOne({
      where: { id: product_id },
      relations: {
        product_images: true,
      },
    });
    if (!product) {
      throw new NotFoundException('message.product_not_found');
    }

    //* Check if image exist
    const productImage = await this.productImageRepository.findOne({
      where: { id: image_id },
    });
    if (!productImage) {
      throw new NotFoundException('message.product_image_not_found');
    }

    for (let index = 0; index < product.product_images.length; index++) {
      if (product.product_images[index].is_logo == true) {
        await this.productImageRepository.update(
          product.product_images[index].id,
          {
            is_logo: false,
          },
        );
      }
    }
    await this.productImageRepository.update(image_id, {
      is_logo: true,
    });

    //* Return updated image
    return await this.productImageRepository.findOne({
      where: { id: image_id },
    });
  }

  //* Get All Products For DashBoard
  async getAllProductsForDashboard(
    productsDashboardQuery: ProductsDashboardQuery,
  ) {
    const {
      limit,
      page,
      category_sub_category_id,
      product_name,
      section_id,
      section_category_id,
      sort,
      product_barcode,
      brand_id,
    } = productsDashboardQuery;
    const skip = (page - 1) * limit;
    let productsSort = {};

    switch (sort) {
      case 'new':
        productsSort = { 'product.created_at': 'DESC' };
        break;
      case 'order_by':
        productsSort = { 'product_sub_categories.order_by': 'ASC' };
        break;
      case 'brand':
        productsSort = { 'product.order_by_brand': 'ASC' };
        break;
    }
    let query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.product_images', 'product_images')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect(
        'product.product_sub_categories',
        'product_sub_categories',
      )
      .leftJoinAndSelect(
        'product_sub_categories.category_subCategory',
        'category_subCategory',
      )
      .leftJoinAndSelect(
        'category_subCategory.section_category',
        'section_category',
      )
      .leftJoinAndSelect('section_category.section', 'section')
      .leftJoinAndSelect('section_category.category', 'category')
      .leftJoinAndSelect('product.warehouses_products', 'warehousesProduct')
      .leftJoinAndSelect(
        'product.product_measurements',
        'product_measurements',
        'product_measurements.is_main_unit = true',
      )
      .leftJoinAndSelect(
        'product_measurements.measurement_unit',
        'measurement_unit',
      )
      .orderBy(productsSort)
      // .orderBy('product.created_at', 'DESC')
      .skip(skip)
      .take(limit);
    // Add search term condition if provided

    if (product_name) {
      // Determine if the product_name is Arabic
      const isProductNameArabic = this.isArabic(product_name); // Implement or use a library to check if the text is Arabic

      // Build the query conditionally based on the language of product_name
      if (isProductNameArabic) {
        query = query.andWhere(
          new Brackets((qb) => {
            qb.where('product.name_ar LIKE :product_name', {
              product_name: `%${product_name}%`,
            })
              .orWhere('product.keywords LIKE :product_name', {
                product_name: `%${product_name}%`,
              })
              .orWhere('product.barcode LIKE :product_barcode', {
                product_barcode: `%${product_barcode}%`,
              });
          }),
        );
      } else {
        query = query.andWhere(
          new Brackets((qb) => {
            qb.where('product.name_en LIKE :product_name', {
              product_name: `%${product_name}%`,
            })
              .orWhere('product.keywords LIKE :product_name', {
                product_name: `%${product_name}%`,
              })
              .orWhere('product.barcode LIKE :product_barcode', {
                product_barcode: `%${product_barcode}%`,
              });
          }),
        );
      }
    }
    if (brand_id) {
      query = query.andWhere('brand.id = :brandId', {
        brandId: brand_id,
      });
    }

    // Conditional where clause based on sub category
    if (category_sub_category_id) {
      query = query.andWhere(
        'product_sub_categories.category_sub_category_id = :category_sub_category_id',
        {
          category_sub_category_id,
        },
      );
    }

    if (section_category_id) {
      query = query.andWhere(
        'category_subCategory.section_category_id = :section_category_id',
        {
          section_category_id,
        },
      );
    }
    if (section_id) {
      query = query.andWhere('section_category.section_id = :section_id', {
        section_id,
      });
    }

    // if (product_barcode) {
    //   query = query.orWhere('product.barcode LIKE :product_barcode', {
    //     product_barcode: `%${product_barcode}%`,
    //   });
    // }
    const [products, total] = await query.getManyAndCount();
    return { products, total };
  }

  async getAllProductsOffersForDashboard(
    productsDashboardQuery: ProductsDashboardQuery,
  ) {
    const {
      page,
      limit,
      section_category_id,
      section_id,
      category_sub_category_id,
      product_barcode,
      product_name,
      sort,
    } = productsDashboardQuery;
    const skip = (page - 1) * limit;

    // Start building the query
    let query = this.productOfferRepository
      .createQueryBuilder('product_offer')
      .innerJoinAndSelect(
        'product_offer.product_category_price',
        'product_category_prices',
      )

      .leftJoinAndSelect(
        'product_category_prices.product_additional_services',
        'product_additional_services',
      )
      .leftJoinAndSelect(
        'product_additional_services.additional_service',
        'additional_service',
      )

      .innerJoinAndSelect(
        'product_category_prices.product_measurement',
        'product_measurement',
      )
      .innerJoinAndSelect(
        'product_measurement.measurement_unit',
        'measurement_unit',
      )

      .innerJoinAndSelect(
        'product_category_prices.product_sub_category',
        'product_sub_category',
      )

      .innerJoinAndSelect(
        'product_sub_category.category_subCategory',
        'category_subCategory',
      )
      .innerJoinAndSelect(
        'category_subCategory.section_category',
        'section_category',
      )
      .leftJoinAndSelect('section_category.section', 'section')
      .innerJoinAndSelect('product_sub_category.product', 'product')
      .innerJoinAndSelect('product.warehouses_products', 'warehousesProduct')
      .innerJoinAndSelect(
        'product.product_measurements',
        'product_measurements',
      )

      .innerJoinAndSelect('product.product_images', 'product_images')

      .orderBy('product_offer.order_by', 'ASC')
      .skip(skip)
      .take(limit);

    // Add search term condition if provided
    if (product_name) {
      // Determine if the product_name is Arabic
      const isProductNameArabic = this.isArabic(product_name); // Implement or use a library to check if the text is Arabic

      // Build the query conditionally based on the language of product_name
      if (isProductNameArabic) {
        query = query.andWhere(
          new Brackets((qb) => {
            qb.where('product.name_ar LIKE :product_name', {
              product_name: `%${product_name}%`,
            })
              .orWhere('product.keywords LIKE :product_name', {
                product_name: `%${product_name}%`,
              })
              .orWhere('product.barcode LIKE :product_barcode', {
                product_barcode: `%${product_barcode}%`,
              });
          }),
        );
      } else {
        query = query.andWhere(
          new Brackets((qb) => {
            qb.where('product.name_en LIKE :product_name', {
              product_name: `%${product_name}%`,
            })
              .orWhere('product.keywords LIKE :product_name', {
                product_name: `%${product_name}%`,
              })
              .orWhere('product.barcode LIKE :product_barcode', {
                product_barcode: `%${product_barcode}%`,
              });
          }),
        );
      }
    }

    // Conditional where clause based on sub category
    if (category_sub_category_id) {
      query = query.andWhere(
        'product_sub_category.category_sub_category_id = :category_sub_category_id',
        {
          category_sub_category_id,
        },
      );

      query = query.andWhere('product.is_active = true');
      query = query.andWhere('product_sub_category.is_active = true');
    }

    // Conditional where clause based on section
    if (section_id) {
      query = query.andWhere('section_category.section_id = :section_id', {
        section_id,
      });
      query = query.andWhere('product.is_active = true');
      query = query.andWhere('product_sub_category.is_active = true');
    }
    const [products, total] = await query.getManyAndCount();
    return { products, total };
  }
  async getSingleProductOfferDashboard(offer_id: string) {
    // Start building the query
    let query = this.productOfferRepository
      .createQueryBuilder('product_offer')
      .leftJoinAndSelect(
        'product_offer.product_category_price',
        'product_category_prices',
      )

      .leftJoinAndSelect(
        'product_category_prices.product_additional_services',
        'product_additional_services',
      )
      .leftJoinAndSelect(
        'product_additional_services.additional_service',
        'additional_service',
      )

      .leftJoinAndSelect(
        'product_category_prices.product_measurement',
        'product_measurement',
      )
      .leftJoinAndSelect(
        'product_measurement.measurement_unit',
        'measurement_unit',
      )

      .leftJoinAndSelect(
        'product_category_prices.product_sub_category',
        'product_sub_category',
      )

      .leftJoinAndSelect(
        'product_sub_category.category_subCategory',
        'category_subCategory',
      )
      .leftJoinAndSelect(
        'category_subCategory.section_category',
        'section_category',
      )
      .leftJoinAndSelect('section_category.section', 'section')
      .leftJoinAndSelect('product_sub_category.product', 'product')
      .leftJoinAndSelect('product.warehouses_products', 'warehousesProduct')
      .leftJoinAndSelect('product.product_measurements', 'product_measurements')

      .leftJoinAndSelect('product.product_images', 'product_images')

      // .where(
      //   'product_offer.offer_quantity > 0 AND product_offer.start_date <= :current_date AND product_offer.end_date >= :current_date',
      //   {
      //     current_date: new Date(),
      //   },
      // )
      .andWhere('product_offer.id = :offer_id', { offer_id });
    return await query.getOne();
  }

  //* Get Single Product For Dashboard
  async getSingleProductForDashboard(
    singleProductDashboardQuery: SingleProductDashboardQuery,
  ) {
    const { category_sub_category_id, product_id } =
      singleProductDashboardQuery;

    const product_check = await this.productRepository
      .createQueryBuilder('product')
      .where('product.id = :product_id OR product.barcode = :product_id', {
        product_id,
      })
      .getOne();
    if (!product_check) {
      throw new NotFoundException('message.product_not_found');
    }
    const productSubCategory = await this.productSubCategory_repo
      .createQueryBuilder('productSubCategory')
      .leftJoinAndSelect('productSubCategory.product', 'product')
      .where('product.id = :product_id OR product.barcode = :product_id', {
        product_id,
      })
      .andWhere(
        'productSubCategory.category_sub_category_id = :category_sub_category_id',
        { category_sub_category_id },
      )
      .getOne();

    if (category_sub_category_id) {
      if (!productSubCategory) {
        throw new NotFoundException(
          'message.no_relation_between_product_and_sub_category',
        );
      }
    }

    // For guests and individuals, orders are taken from the nearest warehouse
    // Start building the query
    let query = this.productRepository.createQueryBuilder('product');
    // Conditional where clause based on sub category
    if (category_sub_category_id) {
      query = query.leftJoinAndSelect(
        'product.product_sub_categories',
        'product_sub_categories',
        'product_sub_categories.category_sub_category_id = :category_sub_category_id',
        { category_sub_category_id },
      );
    } else {
      query = query.leftJoinAndSelect(
        'product.product_sub_categories',
        'product_sub_categories',
      );
    }
    query
      .leftJoinAndSelect('product.product_images', 'product_images')
      .leftJoinAndSelect(
        'product_sub_categories.category_subCategory',
        'product_category_subCategory',
      )
      .leftJoinAndSelect(
        'product_category_subCategory.subcategory',
        'subcategory',
      )
      .leftJoinAndSelect(
        'product_category_subCategory.section_category',
        'product_section_category',
      )

      .leftJoinAndSelect('product_section_category.section', 'product_section')
      .leftJoinAndSelect('product.warehouses_products', 'warehousesProduct')
      .leftJoinAndSelect('warehousesProduct.warehouse', 'warehouse')

      .leftJoinAndSelect('product.product_measurements', 'product_measurements')

      .leftJoinAndSelect(
        'product_measurements.measurement_unit',
        'measurement_unit',
      )
      .leftJoinAndSelect(
        'product_measurements.product_category_prices',
        'product_category_prices',
      )
      .leftJoinAndSelect(
        'product_category_prices.product_additional_services',
        'product_additional_services',
      )
      .leftJoinAndSelect(
        'product_additional_services.additional_service',
        'additional_service',
      );
    if (category_sub_category_id) {
      query = query.leftJoinAndSelect(
        'product_category_prices.product_sub_category',
        'product_sub_category',
        'product_sub_category.category_sub_category_id = :category_sub_category_id',
        { category_sub_category_id },
      );
    } else {
      query = query.leftJoinAndSelect(
        'product_category_prices.product_sub_category',
        'product_sub_category',
      );
    }

    query
      .leftJoinAndSelect(
        'product_sub_category.category_subCategory',
        'category_subCategory',
      )

      .leftJoin('category_subCategory.section_category', 'section_category');

    // Get single product
    query = query.andWhere(
      'product.id = :product_id OR product.barcode = :product_id',
      {
        product_id,
      },
    );

    return await query.getOne();
  }

  async deleteProduct(product_id: string): Promise<DeleteResult> {
    return await this.deleteProductTransaction.run({
      product_id,
    });
  }

  async deleteProductImage(
    product_id: string,
    image_id: string,
  ): Promise<DeleteResult> {
    const product = await this.productRepository.findOne({
      where: { id: product_id },
      relations: { product_images: true },
    });
    if (!product) {
      throw new NotFoundException('message.product_not_found');
    }
    const image = await this.productImageRepository.findOne({
      where: { id: image_id },
    });

    if (!image) {
      throw new NotFoundException('message.product_image_not_found');
    }

    if (image.is_logo) {
      throw new BadRequestException('message.logo_cannot_be_deleted');
    }

    return await this.productImageRepository.delete({ id: image_id });
  }

  async deleteProductMeasurement(
    product_id: string,
    product_measurement_id: string,
  ): Promise<DeleteResult> {
    const product = await this.productRepository.findOne({
      where: { id: product_id },
    });
    if (!product) {
      throw new NotFoundException('message.product_not_found');
    }
    // const measurement = await this.SingleProductMeasurement(
    //   product_id,
    //   product_measurement_id,
    // );
    // if (measurement.is_main_unit == true) {
    //   throw new NotFoundException(
    //     'There must be at least one main measurement',
    //   );
    // }
    return await this.productMeasurementRepository.delete({
      id: product_measurement_id,
    });
  }

  async exportProducts() {
    const products = await this.productRepository.find({
      relations: {
        warehouses_products: true,
        product_measurements: { measurement_unit: true },
        product_sub_categories: {
          category_subCategory: {
            section_category: {
              category: true,
              section: true,
            },
            subcategory: true,
          },
        },
      },
      order: { name_ar: 'ASC' },
    });

    // Create a flat structure for products
    const flattenedProducts = products.map((product) => {
      return {
        // productId: product.id,
        // createdAt: product.created_at,
        // updatedAt: product.updated_at,
        barcode: product.barcode,
        name_ar: product.name_ar,
        name_en: product.name_en,

        description_ar: product.description_ar,
        description_en: product.description_en,
        // is_active: product.is_active,
        // is_recovered: product.is_recovered,
        // product_images: product.product_images.map((image) => ({
        //   url: image.url,
        //   is_logo: image.is_logo,
        // })),
        measurement_units_en: product.product_measurements.map(
          (measurement) => measurement.measurement_unit?.name_en,
        ),
        measurement_units_ar: product.product_measurements.map(
          (measurement) => measurement.measurement_unit?.name_ar,
        ),
        // warehousesProducts: product.warehouses_products,
        // productMeasurements: product.product_measurements.map(
        //   (measurement) => ({
        //     measuremen_id: measurement.id,
        //     conversion_factor: measurement.conversion_factor,
        //     product_id: measurement.product_id,
        //     measurement_unit_id: measurement.measurement_unit_id,
        //     base_unit_id: measurement.base_unit_id,
        //     is_main_unit: measurement.is_main_unit,
        //   }),
        // // ),
        // productSubCategories: product.product_sub_categories.map(
        //   (subCategory) => ({
        //     subCategory_id: subCategory.category_subCategory.subcategory.id,
        //     subCategory_name_ar:
        //       subCategory.category_subCategory.subcategory.name_ar,
        //     subCategory_name_en:
        //       subCategory.category_subCategory.subcategory.name_en,
        //     category_id:
        //       subCategory.category_subCategory.section_category.category.id,
        //     category_name_ar:
        //       subCategory.category_subCategory.section_category.category
        //         .name_ar,
        //     category_name_en:
        //       subCategory.category_subCategory.section_category.category
        //         .name_en,
        //     section_id:
        //       subCategory.category_subCategory.section_category.section.id,
        //     section_name_ar:
        //       subCategory.category_subCategory.section_category.section.name_ar,
        //     section_name_en:
        //       subCategory.category_subCategory.section_category.section.name_en,
        //   }),
        // ),
      };
    });

    return await this._fileService.exportExcel(
      flattenedProducts,
      'products',
      'products',
    );
  }
  async exportunLiknedProducts() {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.warehouses_products', 'warehouses_products')
      .where('warehouses_products.id IS NULL')

      .leftJoinAndSelect('product.product_images', 'product_images')
      .leftJoinAndSelect(
        'product.product_sub_categories',
        'product_sub_categories',
      )
      .leftJoinAndSelect(
        'product_sub_categories.category_subCategory',
        'product_category_subCategory',
      )
      .orWhere('product_category_subCategory.id IS NULL')
      .leftJoinAndSelect(
        'product_category_subCategory.subcategory',
        'subcategory',
      )
      .leftJoinAndSelect(
        'product_category_subCategory.section_category',
        'product_section_category',
      )
      .leftJoinAndSelect('product_section_category.category', 'category')

      .leftJoinAndSelect('product.product_measurements', 'product_measurements')
      .leftJoinAndSelect(
        'product_measurements.measurement_unit',
        'measurement_unit',
      )
      // Include other relations as needed
      .orderBy('product.name_ar', 'ASC')
      .getMany();
    // Create a flat structure for products
    const flattenedProducts = products.map((product) => {
      return {
        // productId: product.id,
        // createdAt: product.created_at,
        // updatedAt: product.updated_at,
        barcode: product.barcode,
        name_ar: product.name_ar,
        name_en: product.name_en,
        subcategory:
          product.product_sub_categories[0]?.category_subCategory.subcategory
            .name_ar,
        category:
          product.product_sub_categories[0]?.category_subCategory
            .section_category.category.name_ar,

        description_ar: product.description_ar,
        description_en: product.description_en,
        // is_active: product.is_active,
        // is_recovered: product.is_recovered,
        product_images: product.product_images.map((image) => ({
          url: image.url,
          is_logo: image.is_logo,
        })),
        measurement_units_en: product.product_measurements.map(
          (measurement) => measurement.measurement_unit?.name_en,
        ),
        measurement_units_ar: product.product_measurements.map(
          (measurement) => measurement.measurement_unit?.name_ar,
        ),
        // warehousesProducts: product.warehouses_products,
        // productMeasurements: product.product_measurements.map(
        //   (measurement) => ({
        //     measuremen_id: measurement.id,
        //     conversion_factor: measurement.conversion_factor,
        //     product_id: measurement.product_id,
        //     measurement_unit_id: measurement.measurement_unit_id,
        //     base_unit_id: measurement.base_unit_id,
        //     is_main_unit: measurement.is_main_unit,
        //   }),
        // // ),
        // productSubCategories: product.product_sub_categories.map(
        //   (subCategory) => ({
        //     subCategory_id: subCategory.category_subCategory.subcategory.id,
        //     subCategory_name_ar:
        //       subCategory.category_subCategory.subcategory.name_ar,
        //     subCategory_name_en:
        //       subCategory.category_subCategory.subcategory.name_en,
        //     category_id:
        //       subCategory.category_subCategory.section_category.category.id,
        //     category_name_ar:
        //       subCategory.category_subCategory.section_category.category
        //         .name_ar,
        //     category_name_en:
        //       subCategory.category_subCategory.section_category.category
        //         .name_en,
        //     section_id:
        //       subCategory.category_subCategory.section_category.section.id,
        //     section_name_ar:
        //       subCategory.category_subCategory.section_category.section.name_ar,
        //     section_name_en:
        //       subCategory.category_subCategory.section_category.section.name_en,
        //   }),
        // ),
      };
    });

    return await this._fileService.exportExcel(
      flattenedProducts,
      'products',
      'products',
    );
  }

  async exportLinkedProducts() {
    const productSubCategory = await this.productSubCategory_repo.find({
      relations: {
        product_prices: { product_measurement: { measurement_unit: true } },
        product: {
          product_measurements: { measurement_unit: true },
        },
        category_subCategory: {
          subcategory: true,
          section_category: { category: true },
        },
      },
      order: {
        category_subCategory: {
          section_category: { category: { name_ar: 'ASC' } },
          subcategory: { name_ar: 'ASC' },
        },
      },
    });

    // Create a flat structure for products
    const flattenedProducts = productSubCategory.map((product) => {
      return {
        barcode: product.product.barcode,
        category_ar:
          product.category_subCategory.section_category.category.name_ar,
        category_en:
          product.category_subCategory.section_category.category.name_en,
        subcategory_ar: product.category_subCategory.subcategory.name_ar,
        subcategory_en: product.category_subCategory.subcategory.name_en,
        name_ar: product.product.name_ar,
        name_en: product.product.name_en,

        description_ar: product.product?.description_ar,
        description_en: product.product?.description_en,

        measurement_units_en: product.product.product_measurements.map(
          (measurement) => measurement.measurement_unit?.name_en,
        ),
        measurement_units_ar: product.product.product_measurements.map(
          (measurement) => measurement.measurement_unit?.name_ar,
        ),
        prices: product.product_prices.map(
          (price) =>
            price.price +
            ':' +
            price.product_measurement.measurement_unit.name_en,
        ),
      };
    });

    return await this._fileService.exportExcel(
      flattenedProducts,
      'products',
      'products',
    );
  }

  async exportWarehouseProducts(warehouse_id: string, quantity?) {
    const warehouse_products = await this.warehouse_products_repo.find({
      where: quantity
        ? { warehouse_id, quantity: LessThanOrEqual(quantity) }
        : { warehouse_id },
      relations: {
        product: {
          product_sub_categories: {
            category_subCategory: {
              subcategory: true,
              section_category: { category: true },
            },
          },
        },
        product_measurement: { measurement_unit: true },
      },
      order: { product: { name_ar: 'ASC' } },
    });

    // Create a flat structure for products
    const flattenedProducts = warehouse_products.map((product) => {
      return {
        barcode: product.product.barcode,
        name_ar: product.product.name_ar,
        name_en: product.product.name_en,
        subcategory:
          product.product.product_sub_categories[0]?.category_subCategory
            .subcategory.name_ar,
        category:
          product.product.product_sub_categories[0]?.category_subCategory
            .section_category.category.name_ar,
        quatntity: product.quantity,
        measurement_units_ar:
          product.product_measurement.measurement_unit.name_ar,
        measurement_units_en:
          product.product_measurement.measurement_unit.name_en,

        description_ar: product.product?.description_ar,
        description_en: product.product?.description_en,
      };
    });

    return await this._fileService.exportExcel(
      flattenedProducts,
      'products',
      'products',
    );
  }
  async exportWarehouseProductsPricing() {
    const warehouse_products = await this.warehouse_products_repo.find({
      relations: {
        product: { product_sub_categories: { product_prices: true } },
        product_measurement: { measurement_unit: true },
      },
      order: { product: { name_ar: 'ASC' } },
    });

    // Create a flat structure for products
    const flattenedProducts = warehouse_products.map((product) => {
      return {
        المجموعة: 'عام',
        الوحدة: 'قطعة',

        الكمية: product.quantity,
        السعر:
          product.product?.product_sub_categories[0]?.product_prices[0]?.price,

        الاسم: product.product?.name_ar,
        الكود: product.product?.barcode,
      };
    });

    return await this._fileService.exportExcel(
      flattenedProducts,
      'products',
      'products',
    );
  }

  async exportSellingReport(day: string) {
    // Calculate the time range
    const date = new Date(day);
    const startTime = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    const endTime = new Date(date.getTime() + 3 * 60 * 60 * 1000); // Add 3 hours

    // Query using Between
    const result = await this.shipmentProduct_repo
      .createQueryBuilder('shipment_product')

      .leftJoinAndSelect('shipment_product.shipment', 'shipment')
      .where(
        '((DATE(shipment.order_delivered_at) = :orderDate AND TIME(shipment.order_delivered_at) < "21:00:00") OR (DATE(shipment.order_delivered_at) = DATE_SUB(:orderDate, INTERVAL 1 DAY) AND TIME(shipment.order_delivered_at) >= "21:00:00"))',
        { orderDate: day },
      )
      .leftJoinAndSelect('shipment.order', 'order')
      .andWhere('shipment.status = :status', {
        status: ShipmentStatusEnum.DELIVERED,
      })
      .leftJoinAndSelect('order.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('shipment_product.product', 'product')
      .getMany();

    if (result.length < 1)
      throw new NotFoundException('message.no_selling_report_found');

    const sellingReport = result.map((product) => {
      return {
        المحفظة: product.shipment.order.paymentMethod.name_ar,
        'رقم الطلب': product.shipment.order.number,
        التاريخ: day,
        'رقم الصنف': product.product?.barcode,
        'اسم الصنف': product.product?.name_ar,
        الوحدة: 'قطعة',
        الكمية: product.quantity,
        السعر: product.price,
        الاجمالي: product.price * product.quantity,
      };
    });

    return await this._fileService.exportExcel(
      sellingReport,
      'sellingReport',
      'sellingReport',
    );
  }

  async importProducts(req: any) {
    const file = await this.storageManager.store(req.file, {
      path: 'product-export',
    });
    const jsonData = await this._fileService.importExcel(file);

    const CreateProductRequest = plainToClass(CreateProductsExcelRequest, {
      products: jsonData,
    });
    const validationErrors = await validate(CreateProductRequest);
    if (validationErrors.length > 0) {
      throw new BadRequestException(JSON.stringify(validationErrors));
    }

    const newProducts = jsonData.map((productData) => {
      const {
        name_ar,
        name_en,
        description_ar,
        description_en,
        is_active,
        is_recovered,
        product_images,
      } = plainToClass(CreateProductExcelRequest, productData);

      return this.productRepository.create({
        name_ar,
        name_en,
        description_ar,
        description_en,
        is_active,
        is_recovered,
        product_images,
      });
    });

    return await this.productRepository.save(newProducts);
  }

  private async SingleProductMeasurement(
    product_id: string,
    product_measurement_id: string,
  ): Promise<ProductMeasurement> {
    const product = await this.productRepository.findOne({
      where: { id: product_id },
    });
    if (!product) {
      throw new NotFoundException('message.product_not_found');
    }
    const productMeasurement = await this.productMeasurementRepository.findOne({
      where: { id: product_measurement_id },
    });
    if (!productMeasurement) {
      throw new NotFoundException('message.product_measurement_not_found');
    }
    return productMeasurement;
  }

  async getMostSelling(limit?: number) {
    const result = await this.shipmentProduct_repo
      .createQueryBuilder('shipment_product')
      .select('shipment_product.product_id', 'productId')
      .leftJoinAndSelect('shipment_product.product', 'product')
      .leftJoin('shipment_product.shipment', 'shipment')
      .where('shipment.status = :status', {
        status: ShipmentStatusEnum.DELIVERED,
      })
      .addSelect('SUM(shipment_product.quantity)', 'totalQuantity')
      .groupBy('shipment_product.product_id')
      .addGroupBy('product.id')
      .orderBy('totalQuantity', 'DESC')
      .limit(limit ?? 20)
      .getRawMany();

    return result;
  }
  async getSellingStats(start_date?: Date, to_date?: Date) {
    const result = await this.shipmentProduct_repo
      .createQueryBuilder('shipment_product')
      .select('shipment_product.product_id', 'productId')

      .leftJoinAndSelect('shipment_product.product', 'product')
      .addSelect('SUM(shipment_product.quantity)', 'totalQuantity')
      .addSelect('SUM(shipment_product.price)', 'totalPrice')
      .groupBy('shipment_product.product_id')
      .orderBy('totalQuantity', 'DESC')
      .withDeleted()
      .where(
        'shipment_product.created_at > :start_date AND shipment_product.created_at < :to_date',
        {
          start_date: start_date ?? null,
          to_date: to_date ?? null,
        },
      )

      .getRawMany();
    const sellingReport = result.map((product) => {
      return {
        name_ar: product.product_name_ar,
        name_en: product.product_name_en,
        barcode: product.product_barcode,
        totalPrice: product.totalPrice,
        totalQuantity: product.totalQuantity,
        avgPrice:
          Math.round((product.totalPrice / product.totalQuantity) * 100) / 100,
      };
    });

    if (sellingReport.length < 1)
      throw new NotFoundException('message.no_selling_report_found');
    return await this._fileService.exportExcel(
      sellingReport,
      'sellingReport',
      'sellingReport',
    );
  }

  async CreateBrand(req: CreateBrandRequest) {
    const path = await this._fileService.upload(req.logo, 'brands');
    const brand = plainToClass(Brand, { ...req, logo: path });

    const saved = await this.brand_repo.save(brand);
    await this.orderItems(true);
    return saved;
  }

  async updateBrand(req: UpdateBrandRequest) {
    let path;
    if (req?.logo != null) {
      path = await this._fileService.upload(req.logo, 'brands');
    }
    const savedBrand = await this.brand_repo.findOne({ where: { id: req.id } });
    if (!savedBrand) {
      throw new NotFoundException('brand not found');
    }

    await this.orderItems(savedBrand.order > req.order ? false : true);
    const brand =
      path == null
        ? plainToClass(Brand, req)
        : plainToClass(Brand, { ...req, logo: path });

    return await this.brand_repo.update(brand.id, brand);
  }

  async orderItems(asc: boolean) {
    try {
      const brands = await this.brand_repo.find({
        order: {
          order: 'ASC',
          updated_at: asc ? 'ASC' : 'DESC',
        },
      });

      let order = 1;
      for (const item of brands) {
        item.order = order++;
      }

      await this.brand_repo.save(brands);
    } catch (error) {
      console.error('Error occurred:', error.message);
    }
  }
  async getBrandCategories(brand_id: string, section_id: string) {
    const products = await this.getAllProductsForDashboard(
      new ProductsDashboardQuery({
        brand_id,
        limit: 1000,
        page: 1,
        section_id,
        sort: 'brand',
      }),
    );

    // return products;
    const categoriesGroupedById = products['products'].reduce(
      (acc: any, product) => {
        product.product_sub_categories.forEach((subCategory) => {
          const category =
            subCategory.category_subCategory.section_category.category;

          if (!acc.find((item) => item.id == category?.id)) {
            acc.push({
              ...category,
              section_category_id:
                subCategory.category_subCategory.section_category.id,
              order: subCategory.category_subCategory.section_category.order_by,
            });
          }
        });
        return acc;
      },
      [],
    );

    categoriesGroupedById.sort((a, b) => a.order - b.order);
    return categoriesGroupedById;
  }

  async getLargeImages() {
    const products = [];
    const data = fs.readFileSync('./json/large_files.csv', 'utf8');

    const images = data.split('\n');
    console.log(images[1]);
    for (const image of images) {
      const data = image.split(',');
      let url = data[0];

      const productImage = await this.productImageRepository.findOne({
        where: { url: Like('%' + url + '%') },
        relations: { product: true },
        withDeleted: true,
      });
      if (!productImage) continue;
      products.push({
        url: toUrl(productImage?.url),
        size: data[1],
        name: productImage.product?.name_ar,
        barcode: productImage.product?.barcode,
      });
    }
    return await this._fileService.exportExcel(
      products,
      'products',
      'products',
    );
  }
}
