import {
  Controller,
  Post,
  Get,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Param,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupActionDto, ChangeOwnerDto } from './dto/group-action.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('api/groups')
@Controller('api/groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('group_image'))
  async createGroup(
    @Body() createGroupDto: CreateGroupDto,
    @UploadedFile() groupImage: Express.Multer.File,
    @Request() req,
  ) {
    if (groupImage) {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedMimeTypes.includes(groupImage.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG and GIF images are allowed.',
        );
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (groupImage.size > maxSize) {
        throw new BadRequestException('File too large. Maximum size allowed is 5MB.');
      }
    }

    return this.groupService.createGroup(createGroupDto, groupImage, req.user);
  }

  @Post('leave/:groupId')
  @ApiOperation({ summary: 'Leave a group' })
  @ApiResponse({ status: 200, description: 'Successfully left the group' })
  async leaveGroup(
    @Param('groupId') groupId: string,
    @Request() req,
  ) {
    return this.groupService.leaveGroup(groupId, req.user);
  }

  @Post('change-owner')
  @ApiOperation({ summary: 'Change group owner' })
  @ApiResponse({ status: 200, description: 'Group owner changed successfully' })
  async changeOwner(
    @Body() changeOwnerDto: ChangeOwnerDto,
    @Request() req,
  ) {
    return this.groupService.changeOwner(changeOwnerDto, req.user);
  }

  @Get('member-groups')
  @ApiOperation({ summary: 'Get groups where user is a member' })
  @ApiResponse({ status: 200, description: 'List of groups retrieved successfully' })
  async getMemberGroups(@Request() req) {
    return this.groupService.getMemberGroups(req.user);
  }

  @Get('owned-groups')
  @ApiOperation({ summary: 'Get groups where user is the owner' })
  @ApiResponse({ status: 200, description: 'List of owned groups retrieved successfully' })
  async getOwnedGroups(@Request() req) {
    return this.groupService.getOwnedGroups(req.user);
  }

  @Get(':groupId/members')
  @ApiOperation({ summary: 'Get all members of a group' })
  @ApiResponse({ status: 200, description: 'Group members retrieved successfully' })
  async getGroupMembers(@Param('groupId') groupId: string) {
    return this.groupService.getGroupMembers(groupId);
  }
} 