import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../entities/product.entity';

export class ProductTypeOrmCrudAdapter {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) {}
}
