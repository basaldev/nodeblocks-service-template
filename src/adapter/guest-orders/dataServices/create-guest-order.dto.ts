import { CreateGuestOrderRequest } from '../types';

import { util } from '@basaldev/blocks-backend-sdk';
import { JSONSchemaType } from 'ajv';

export function getCreateGuestOrderDtoSchema(
  customFields: util.CustomField[]
): JSONSchemaType<CreateGuestOrderRequest> {
  return {
    additionalProperties: false,
    properties: {
      customFields: util.createCustomFieldAjvSchemaComponent(customFields),
      customer: {
        properties: {
          addressLine1: { isNotEmpty: true, type: 'string' },
          addressLine2: { nullable: true, type: 'string' },
          addressLine3: { nullable: true, type: 'string' },
          age: {
            nullable: true,
            pattern: '^[0-9]*$',
            type: 'string',
          },
          email: { isNotEmpty: true, type: 'string' },
          name: { isNotEmpty: true, type: 'string' },
          nameKana: { isNotEmpty: true, type: 'string' },
          phone: { isNotEmpty: true, type: 'string' },
          preferredContactMethod: { nullable: true, type: 'string' },
          preferredTimeToContact: { nullable: true, type: 'string' },
        },
        required: ['name', 'nameKana', 'addressLine1', 'phone', 'email'],
        type: 'object',
      },
      items: {
        default: [],
        items: {
          additionalProperties: false,
          properties: {
            productId: { type: 'string' },
            quantity: { type: 'number' },
            variantId: { type: 'string' },
          },
          required: ['productId', 'variantId', 'quantity'],
          type: 'object',
        },
        type: 'array',
      },
      status: { nullable: true, type: 'string' },
    },
    required: ['items', 'customer'],
    type: 'object',
  };
}
