import { Resolver, Query, Args } from '@nestjs/graphql';
import { SampleService } from './sample.service';
import { HelloDto } from './dto/hello.dto';

@Resolver(() => HelloDto)
export class SampleResolver {
  constructor(private readonly sampleService: SampleService) {}

  @Query(() => HelloDto, { name: 'hello' })
  getHello(@Args('name', { type: () => String, nullable: true }) name?: string): HelloDto {
    return this.sampleService.getHello(name);
  }
}
