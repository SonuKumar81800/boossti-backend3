import { DB } from '../utils/DB';
import ListType from '../list/utils/listTypeModel';
import ListItem from '../list/utils/listItemModel';
import { User } from '../user/utils/userModel';
import Field from './utils/fieldModel';
import FieldValue from './utils/fieldValueModel';
import { getCurretnUser } from '../utils/authentication';
import { AppSyncEvent } from '../utils/cutomTypes';
import { userPopulate } from '../utils/populate';

const fieldPopulate = [
  userPopulate,
  {
    path: 'typeId',
    select: 'title slug',
  },
];

const fieldValuePopulate = [
  userPopulate,
  {
    path: 'itemId',
    select: 'title slug',
  },
];

export const handler = async (event: AppSyncEvent): Promise<any> => {
  try {
    await DB();
    const { fieldName } = event.info;
    const { identity } = event;
    const user = await getCurretnUser(identity);
    let args = { ...event.arguments };

    if (fieldName.toLocaleLowerCase().includes('create') && user && user._id) {
      args = { ...args, createdBy: user._id };
    } else if (
      fieldName.toLocaleLowerCase().includes('update') &&
      user &&
      user._id
    ) {
      args = { ...args, updatedBy: user._id };
    }

    switch (fieldName) {
      case 'getFieldsByType': {
        const { page = 1, limit = 20, search = '', parentId } = args;
        const data = await Field.find({
          parentId,
          label: { $regex: search, $options: 'i' },
        })
          .populate(fieldPopulate)
          .limit(limit * 1)
          .skip((page - 1) * limit);

        const count = await Field.countDocuments({
          parentId,
          label: { $regex: search, $options: 'i' },
        });
        return {
          data,
          count,
        };
      }
      case 'createField': {
        const field = await Field.create(args);
        return await field.populate(fieldPopulate).execPopulate();
      }
      case 'updateField': {
        const field: any = await Field.findByIdAndUpdate(args._id, args, {
          new: true,
          runValidators: true,
        });
        return await field.populate(fieldPopulate).execPopulate();
      }
      case 'deleteField': {
        await Field.findByIdAndDelete(args._id);
        return true;
      }
      case 'getFieldValuesByItem': {
        const {
          page = 1,
          limit = 20,
          parentId,
          field,
          onlyShowByUser = null,
        } = args;
        const tempFilter: any = {};

        if (onlyShowByUser) {
          tempFilter.createdBy = user._id;
        }

        const data = await FieldValue.find({ ...tempFilter, parentId, field })
          .populate(fieldValuePopulate)
          .limit(limit * 1)
          .skip((page - 1) * limit);

        const count = await FieldValue.countDocuments({
          ...tempFilter,
          parentId,
          field,
        });

        return {
          data,
          count,
        };
      }
      case 'createFieldValue': {
        const fieldValue = await FieldValue.create(args);
        return await fieldValue.populate(fieldValuePopulate).execPopulate();
      }
      case 'updateFieldValue': {
        const fieldValue: any = await FieldValue.findByIdAndUpdate(
          args._id,
          args,
          {
            new: true,
            runValidators: true,
          }
        );
        return await fieldValue.populate(fieldValuePopulate).execPopulate();
      }
      case 'deleteFieldValue': {
        await FieldValue.findByIdAndDelete(args._id);
        return true;
      }
      default:
        if (args.registerModel) {
          await ListType.findOne();
          await User.findOne();
          await ListItem.findOne();
        }
        throw new Error(
          'Something went wrong! Please check your Query or Mutation'
        );
    }
  } catch (error) {
    const error2 = error;
    throw error2;
  }
};