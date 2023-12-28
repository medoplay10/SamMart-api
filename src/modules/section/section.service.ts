import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Section } from 'src/infrastructure/entities/section/section.entity';
import { Any, In, Like, Repository } from 'typeorm';
import { Request } from 'express';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { User } from 'src/infrastructure/entities/user/user.entity';
import { SectionCategory } from 'src/infrastructure/entities/section/section-category.entity';
import { BaseService } from 'src/core/base/service/service.base';
import { CreateSectionRequest } from './dto/requests/create-section.request';
import { ImageManager } from 'src/integration/sharp/image.manager';
import * as sharp from 'sharp';
import { StorageManager } from 'src/integration/storage/storage.manager';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SectionService extends BaseService<Section> {
  constructor(
    @InjectRepository(Section)
    private readonly section_repo: Repository<Section>,
    @InjectRepository(User) private readonly user_repo: Repository<User>,
    @InjectRepository(SectionCategory) private readonly section_category_repo: Repository<SectionCategory>,
    @Inject(StorageManager) private readonly storageManager: StorageManager,
    @Inject(ImageManager) private readonly imageManager: ImageManager,
    
    @Inject(REQUEST) readonly request: Request,
  ) {super(section_repo);}

  async getSections(): Promise<Section[]> {

  

    return await this.section_repo.find(
      
    );
  }

 async  createSection(req: CreateSectionRequest): Promise<Section> {

  const section= this._repo.create(plainToInstance(Section,req));
  if (req.logo) {
    // resize image to 300x300
    const resizedImage = await this.imageManager.resize(req.logo, {
      size: { width: 300, height: 300 },
      options: {
        fit: sharp.fit.cover,
        position: sharp.strategy.entropy
      },
    });

    // save image
    const path = await this.storageManager.store(
      { buffer: resizedImage, originalname: req.logo.originalname },
      { path: 'section-logo' },
    );

    // set avatar path
    section.logo = path;
  }
  await this._repo.save(section)
  return section;

  }

  async getSectionCategories(section_id: string): Promise<SectionCategory[]> {
      return await this.section_category_repo.find({where:{section_id},relations:{category:true},order:{order_by:"ASC"}});
  }
}
