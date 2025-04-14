import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class HelloDto {
  @Field(() => String)
  message: string;
}
