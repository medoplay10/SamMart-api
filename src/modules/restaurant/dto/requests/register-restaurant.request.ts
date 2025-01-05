import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches } from "class-validator";
import { Unique } from "src/core/validators/unique-constraints.validator";

export class RegisterRestaurantRequest {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name_ar: string; 
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name_en: string; 
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @Unique('user')
    email: string; 
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @Unique('user')
    phone: string; 
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    address_ar: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    address_en: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    logo: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    image: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    city_id: string;
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    cuisines_types_ids: string[];
    
      @ApiProperty()
      @IsNotEmpty()
      @IsString()
      @Matches(
        /^(\+|-)?(?:90(?:(?:\.0{1,15})?)|(?:[0-9]|[1-8][0-9])(?:(?:\.[0-9]{1,15})?))$/,
        { message: 'invalid value for latitude' },
      )
      latitude: string;
    
      @ApiProperty()
      @IsNotEmpty()
      @IsString()
      @Matches(
        /^(\+|-)?(?:180(?:(?:\.0{1,15})?)|(?:[0-9]|[1-9][0-9]|1[0-7][0-9])(?:(?:\.[0-9]{1,15})?))$/,
        { message: 'invalid value for longitude' },
      )
      longitude: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    opening_time: string;
  
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    closing_time: string;    

} 