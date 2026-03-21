import { api } from '@/services/api';
import {
  AddProductMemberRequest,
  AIMentorSettings,
  Product,
  ProductFormInputs,
  ProductMember,
} from '../types/product.types';

export const productsApi = api.injectEndpoints({
  endpoints: builder => ({
    // ================== PRODUCTS ==================
    getAllProducts: builder.query<Product[], { includeAll?: boolean } | void>({
      query: (args) => ({
        url: '/products',
        params: args?.includeAll ? { includeAll: 1 } : undefined,
      }),
      providesTags: result =>
        result
          ? [...result.map(p => ({ type: 'Products' as const, id: p.id })), { type: 'Products', id: 'LIST' }]
          : [{ type: 'Products', id: 'LIST' }],
    }),

    getMyProducts: builder.query<Product[], void>({
      query: () => '/products/my',
      providesTags: result =>
        result
          ? [...result.map(p => ({ type: 'Products' as const, id: p.id })), { type: 'Products', id: 'LIST' }]
          : [{ type: 'Products', id: 'LIST' }],
    }),

    createProduct: builder.mutation<Product, ProductFormInputs>({
      query: body => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Products', 'Access'],
    }),
    getProductById: builder.query<Product, string>({
      query: productId => `/products/${productId}`,
      providesTags: (result, error, id) => (id ? [{ type: 'Products', id }] : []),
    }),
    updateProduct: builder.mutation<Product, { id: string; data: ProductFormInputs }>({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Products', id }],
    }),
    // ================== MEMBERS ==================
    getProductMembers: builder.query<ProductMember[], string>({
      query: (productId) => `/products/${productId}/members`,
      providesTags: ['Members'],
    }),

    addProductMember: builder.mutation<ProductMember, AddProductMemberRequest>({
      query: ({ productId, userId, role }) => ({
        url: `/products/${productId}/members`,
        method: 'POST',
        body: { userId, role },
      }),
  invalidatesTags: ['Members', 'Access', 'Products'],
    }),

    // ================== AI MENTOR ==================
    getAIMentorSettings: builder.query<AIMentorSettings, string>({
      query: (productId) => `/products/${productId}/ai-mentor`,
      providesTags: ['AIMentor'],
    }),

    createAIMentorSettings: builder.mutation<AIMentorSettings, AIMentorSettings>({
      query: (body) => ({
        url: `/products/${body.productId}/ai-mentor`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AIMentor'],
    }),
        getMyProductMemberships: builder.query<ProductMember[], void>({
          query: () => '/product-members/me',
        }),
    
  }),
});

export const {
  useGetAllProductsQuery,
  useGetMyProductsQuery,
  useCreateProductMutation,
  useGetProductByIdQuery,
  useUpdateProductMutation,
  useGetProductMembersQuery,
  useAddProductMemberMutation,
  useGetAIMentorSettingsQuery,
  useCreateAIMentorSettingsMutation,
    useGetMyProductMembershipsQuery,

} = productsApi;
