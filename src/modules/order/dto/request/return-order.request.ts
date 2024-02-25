import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

class ReturnProductRequest {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID()
    product_id: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsUUID()
    reason_id: string;

    @ApiProperty({nullable: true})
    @IsOptional()
    @IsString()
    customer_note: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    quantity: number;
}

export class ReturnOrderRequest {
    @ApiProperty({ type: [ReturnProductRequest] })
    @IsNotEmpty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReturnProductRequest)
    returned_products: ReturnProductRequest[];

    @ApiProperty({nullable: true})
    @IsOptional()
    @IsString()
    customer_note: string;
}