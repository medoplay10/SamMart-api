import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { I18nResponse } from 'src/core/helpers/i18n.helper';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { UserService } from './user.service';

import { Request } from 'express';

import { REQUEST } from '@nestjs/core';

import { UpdateProfileRequest } from './dto/requests/update-profile.request';

import {
  ProfileResponse,
  UserInfoResponse,
} from './dto/responses/profile.response';
import { UploadValidator } from 'src/core/validators/upload.validator';

import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateFcmRequest } from './dto/requests/update-fcm.request';
import { ActionResponse } from 'src/core/base/responses/action.response';
import { UpdateLanguageRequest } from './dto/requests/update-language.request';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { Roles } from '../authentication/guards/roles.decorator';
import { plainToInstance } from 'class-transformer';
import { UpdateFcmTokenRequest } from './requests/update-fcm-token.request';
import { UserDashboardResponse } from './dto/responses/user-dashboard.response';
import { UsersDashboardQuery } from './dto/filters/user-dashboard.query';

@ApiBearerAuth()
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Language header: en, ar',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(
    private readonly _service: UserService,
    @Inject(REQUEST) readonly request: Request,
    @Inject(I18nResponse) private readonly _i18nResponse: I18nResponse,
  ) {}

  @Put('allow-notification/:allow_notification')
  async allowNotification(
    @Param('allow_notification') allow_notification: boolean,
  ) {
    return new ActionResponse(
      await this._service.allowNotification(allow_notification),
    );
  }

  @Roles(Role.ADMIN)
  @Put('make-resturant')
  async makeResturant(@Body() id: string) {
    const user = await this._service.findOne(id);
    user.roles.push(Role.RESTURANT);
    return new ActionResponse(await this._service.update(user));
  }

  @UseInterceptors(ClassSerializerInterceptor, FileInterceptor('avatarFile'))
  @ApiConsumes('multipart/form-data')
  @Patch('update-profile')
  async updateProfile(
    @Body() req: UpdateProfileRequest,
    @UploadedFile(new UploadValidator().build())
    avatarFile: Express.Multer.File,
  ) {
    if (avatarFile) req.avatarFile = avatarFile;
    const updated = new ProfileResponse({
      user_info: await this._service.updateProfile(req),
    });

    return new ActionResponse(updated);
  }

  @Get('get-profile')
  async profile(): Promise<ActionResponse<ProfileResponse>> {
    const result = new ProfileResponse({
      user_info: this._service.currentUser,
    });

    return new ActionResponse<ProfileResponse>(result);
  }
  @Put('update-fcm-token')
  async updateFcmToken(@Body() updateFcmTokenRequest: UpdateFcmTokenRequest) {
    const result = await this._service.updateFcmToken(updateFcmTokenRequest);
    return new ActionResponse(result);
  }

  @Get('all-clients')
  async getAllClients(@Query() usersDashboardQuery: UsersDashboardQuery) {
    const users = await this._service.getAllClients(usersDashboardQuery);
    const usersResponse = users.map((user) => new UserDashboardResponse(user));
    return new ActionResponse(usersResponse);
  }
}
