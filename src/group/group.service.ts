import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Group, GroupRole } from './schemas/group.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { ChangeOwnerDto } from './dto/group-action.dto';
import { S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
import { User } from '../auth/schemas/user.schema';
import { S3Service } from '../common/services/s3.service';

@Injectable()
export class GroupService {
  private s3: S3;

  constructor(
    @InjectModel(Group.name) private groupModel: Model<Group>,
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
    private s3Service: S3Service,
  ) {
    this.s3 = new S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  async createGroup(createGroupDto: CreateGroupDto, groupImage: Express.Multer.File, currentUser: any) {
    // Convert comma-separated string to array and remove any whitespace
    const memberIdArray = createGroupDto.member_ids
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    // Add current user as owner if not already in the list
    if (!memberIdArray.includes(currentUser.sub)) {
      memberIdArray.push(currentUser.sub);
    }

    if (memberIdArray.length === 1) {
      throw new BadRequestException('At least one member (besides owner) must be provided');
    }

    // Verify all member IDs exist
    const members = await this.userModel.find({
      _id: { $in: memberIdArray },
    });

    if (members.length !== memberIdArray.length) {
      throw new BadRequestException('One or more member IDs are invalid');
    }

    // Upload group image if provided
    let groupImageUrl = null;
    if (groupImage) {
      groupImageUrl = await this.uploadGroupImage(groupImage, createGroupDto.group_name);
    }

    // Create group members array with roles, ensuring current user is owner
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
    // First check if group exists and user is a member
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

    // Replace the entire group document with the updated one
    const updatedGroup = await this.groupModel.replaceOne(
      { _id: groupId },
      group
    );

    if (!updatedGroup) {
      throw new BadRequestException('Failed to update group ownership');
    }
    return group;
  }

  async changeOwner(changeOwnerDto: ChangeOwnerDto, currentUser: any) {
    // First verify the group exists and user permissions
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

    // Replace the entire group document with the updated one
    const updatedGroup = await this.groupModel.replaceOne(
      { _id: changeOwnerDto.group_id },
      group
    );

    if (!updatedGroup) {
      throw new BadRequestException('Failed to update group ownership');
    }

    return group;
  }

  async getMemberGroups(currentUser: any) {
    const groups = await this.groupModel.find({
      'members': {
        $elemMatch: {
          username: currentUser.username,
          role: GroupRole.MEMBER,
        },
      },
    });



    // Generate signed URLs for group images and member profile images
    return Promise.all(
      groups.map(async (group) => ({
        ...group.toObject(),
        group_image: await this.s3Service.getSignedUrl(group.group_image),
        members: await Promise.all(
          group.members.map(async (member) => ({
            ...member,
            profileImage: await this.s3Service.getSignedUrl(member.profileImage),
          }))
        ),
      }))
    );
  }

  async getAllMembersGroups(currentUser: any) {
    const groups = await this.groupModel.find({
      'members': {
        $elemMatch: {
          username: currentUser.username,
        },
      },
    });



    // Generate signed URLs for group images and member profile images
    return Promise.all(
      groups.map(async (group) => ({
        ...group.toObject(),
        group_image: await this.s3Service.getSignedUrl(group.group_image),
        members: await Promise.all(
          group.members.map(async (member) => ({
            ...member,
            profileImage: await this.s3Service.getSignedUrl(member.profileImage),
          }))
        ),
      }))
    );
  }

  async getNotMembersGroups(currentUser: any) {
    const groups = await this.groupModel.find({
      'members': {
        $not: {
          $elemMatch: {
            username: currentUser.username
          }
        }
      }
    });

    // Generate signed URLs for group images and member profile images
    return Promise.all(
      groups.map(async (group) => ({
        ...group.toObject(),
        group_image: await this.s3Service.getSignedUrl(group.group_image),
        members: await Promise.all(
          group.members.map(async (member) => ({
            ...member,
            profileImage: await this.s3Service.getSignedUrl(member.profileImage),
          }))
        ),
      }))
    );
  }

  async getOwnedGroups(currentUser: any) {
    const groups = await this.groupModel.find({
      'members': {
        $elemMatch: {
          userId: new mongoose.Types.ObjectId(currentUser.sub),
          role: GroupRole.OWNER,
        },
      },
    });

    // Generate signed URLs for group images and member profile images
    return Promise.all(
      groups.map(async (group) => ({
        ...group.toObject(),
        group_image: await this.s3Service.getSignedUrl(group.group_image),
        members: await Promise.all(
          group.members.map(async (member) => ({
            ...member,
            profileImage: await this.s3Service.getSignedUrl(member.profileImage),
          }))
        ),
      }))
    );
  }

  async getGroupMembers(groupId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Generate signed URLs for member profile images
    const members = await Promise.all(
      group.members.map(async (member) => ({
        ...member,
        profileImage: await this.s3Service.getSignedUrl(member.profileImage),
      }))
    );

    return members;
  }

  private async uploadGroupImage(file: Express.Multer.File, groupName: string): Promise<string> {
    const bucketName = this.configService.get('AWS_BUCKET_NAME');
    const sanitizedGroupName = groupName.replaceAll(' ', '-');
    const key = `groups/${sanitizedGroupName}-${Date.now()}`;

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

  async getAllUsers() {
    const users = await this.userModel.find({}, {
      password: 0, // Exclude password field
      __v: 0,      // Exclude version field
    });

    // Generate signed URLs for profile images
    return Promise.all(
      users.map(async (user) => ({
        id: user._id,
        username: user.username,
        email: user.email,
        profile_image: await this.s3Service.getSignedUrl(user.profile_image),
      }))
    );
  }
}