import { Module } from '@nestjs/common';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { ProductTypeOrmCrudAdapter } from './product-typeorm-crud.adapter';

@Module({
  imports: [TypeOrmExtModule.forFeature({ product: { entity: null } })],
  providers: [ProductTypeOrmCrudAdapter],
})
export class ProductModule {}
