import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group, GroupRole } from './schemas/group.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { ChangeOwnerDto } from './dto/group-action.dto';
import { S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
import { User } from '../auth/schemas/user.schema';

@Injectable()
export class GroupService {
  private s3: S3;

  constructor(
    @InjectModel(Group.name) private groupModel: Model<Group>,
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
  ) {
    this.s3 = new S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  async createGroup(createGroupDto: CreateGroupDto, groupImage: Express.Multer.File, currentUser: any) {
    // Verify all member IDs exist
    const members = await this.userModel.find({
      _id: { $in: createGroupDto.member_ids },
    });

    if (members.length !== createGroupDto.member_ids.length) {
      throw new BadRequestException('One or more member IDs are invalid');
    }

    // Upload group image if provided
    let groupImageUrl = null;
    if (groupImage) {
      groupImageUrl = await this.uploadGroupImage(groupImage, createGroupDto.group_name);
    }

    // Create group members array with roles
    const groupMembers = members.map(member => ({
      userId: member._id,
      username: member.username,
      profileImage: member.profile_image,
      role: member._id.toString() === currentUser.sub ? GroupRole.OWNER : GroupRole.MEMBER,
    }));

    // Create new group
    const group = new this.groupModel({
      group_name: createGroupDto.group_name,
      group_image: groupImageUrl,
      members: groupMembers,
    });

    return group.save();
  }

  async leaveGroup(groupId: string, currentUser: any) {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const memberIndex = group.members.findIndex(
      member => member.userId.toString() === currentUser.sub,
    );

    if (memberIndex === -1) {
      throw new BadRequestException('You are not a member of this group');
    }

    if (group.members[memberIndex].role === GroupRole.OWNER) {
      throw new BadRequestException('Group owner cannot leave the group');
    }

    group.members.splice(memberIndex, 1);
    return group.save();
  }

  async changeOwner(changeOwnerDto: ChangeOwnerDto, currentUser: any) {
    const group = await this.groupModel.findById(changeOwnerDto.group_id);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const currentOwner = group.members.find(
      member => member.userId.toString() === currentUser.sub && member.role === GroupRole.OWNER,
    );

    if (!currentOwner) {
      throw new UnauthorizedException('Only the group owner can transfer ownership');
    }

    const newOwner = group.members.find(
      member => member.userId.toString() === changeOwnerDto.new_owner_id,
    );

    if (!newOwner) {
      throw new BadRequestException('New owner must be a group member');
    }

    // Update roles
    currentOwner.role = GroupRole.MEMBER;
    newOwner.role = GroupRole.OWNER;

    return group.save();
  }

  async getMemberGroups(currentUser: any) {
    return this.groupModel.find({
      'members': {
        $elemMatch: {
          userId: currentUser.sub,
          role: GroupRole.MEMBER,
        },
      },
    });
  }

  async getOwnedGroups(currentUser: any) {
    return this.groupModel.find({
      'members': {
        $elemMatch: {
          userId: currentUser.sub,
          role: GroupRole.OWNER,
        },
      },
    });
  }

  async getGroupMembers(groupId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group.members;
  }

  private async uploadGroupImage(file: Express.Multer.File, groupName: string): Promise<string> {
    const bucketName = this.configService.get('AWS_BUCKET_NAME');
    const key = `groups/${groupName}-${Date.now()}`;

    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const result = await this.s3.upload(uploadParams).promise();
      return result.Location;
    } catch (error) {
      throw new BadRequestException('Failed to upload group image');
    }
  }
} 