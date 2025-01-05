import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from 'src/core/base/service/service.base';
import {  LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Banar } from 'src/infrastructure/entities/banar/banar.entity';
import { CreateFoodBanarRequest } from './dto/request/create-food-banar.request';
import { FileService } from '../file/file.service';

import { UpdateFoodBannerRequest } from './dto/request/update-food-banner.request';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { User } from 'src/infrastructure/entities/user/user.entity';
import { PaginatedRequest } from 'src/core/base/requests/paginated.request';
import { FoodBanar } from 'src/infrastructure/entities/restaurant/food_banar.entity';

@Injectable()
export class BanarService extends BaseService<FoodBanar> {
    constructor(
        @InjectRepository(FoodBanar) private readonly banarRepository: Repository<FoodBanar>,
        @Inject(FileService) private _fileService: FileService,
        @Inject(REQUEST) private readonly request: Request

    ) {
        super(banarRepository);
    }

    async createBanar(banar: CreateFoodBanarRequest) {
        const tempImage = await this._fileService.upload(
            banar.banar,
            `food-banars`,
        );

        let createdBanar = this.banarRepository.create({
            banar: tempImage,
            started_at: banar.started_at,
            ended_at: banar.ended_at,
            is_active: banar.is_active,
            is_popup:banar?.is_popup,
            restaurant_id:banar?.restaurant_id
        });

        return await this.banarRepository.save(createdBanar);
    }

    async getGuestBanars(query: PaginatedRequest) {
        return await this.banarRepository.find({
            where: {
                is_active: true,
                started_at: LessThanOrEqual(new Date()),
                ended_at: MoreThanOrEqual(new Date()),
                is_popup:false,
               
            }
        });
    }
    async getGuestPopup() {
        return await this.banarRepository.findOne({
            where: {
                is_active: true,
                started_at: LessThanOrEqual(new Date()),
                ended_at: MoreThanOrEqual(new Date()),
                is_popup:true
            }
        });
    }

    async updateBanar(id: string, banar: UpdateFoodBannerRequest) {
        let tempImage = null;
        const banarEntity = await this.banarRepository.findOne({ where: { id } });
        if (!banarEntity) {
            throw new NotFoundException("message.banner_not_found");
        }

        if (banar.banar) {
            tempImage = await this._fileService.upload(
                banar.banar,
                `food-banars`,
            );
        }

        Object.assign(banarEntity, {
            banar: banar.banar ? tempImage : banarEntity.banar,
            started_at: banar.started_at ? banar.started_at : banarEntity.started_at,
            ended_at: banar.ended_at ? banar.ended_at : banarEntity.ended_at,
            is_active: banar.is_active != null ? banar.is_active : banarEntity.is_active,
            restaurant_id:banar?.restaurant_id
            
        });

        return await this.banarRepository.save(banarEntity);
    }

    async deleteBanar(id: string) {
        const banar = await this.banarRepository.findOne({ where: { id } });
        if (!banar) {
            throw new NotFoundException("message.banner_not_found");
        }
        return await this.banarRepository.remove(banar);
    }

    get currentUser(): User {
        return this.request.user;
    }
}
