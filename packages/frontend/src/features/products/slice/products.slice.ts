// features/products/slice/products.slice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '@/features/products/types/product.types';
import type { ProductMini } from '@/features/products/types/product.mini';

interface ProductsState {
  all: Product[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  all: [],
  loading: false,
  error: null,
};

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts(state, action: PayloadAction<Product[]>) {
      state.all = action.payload;
    },
    addProduct(state, action: PayloadAction<Product>) {
      state.all.push(action.payload);
    },
    updateProduct(state, action: PayloadAction<Product>) {
      const idx = state.all.findIndex(p => p.id === action.payload.id);
      if (idx !== -1) state.all[idx] = action.payload;
    },
    removeProduct(state, action: PayloadAction<string>) {
      state.all = state.all.filter(p => p.id !== action.payload);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setProducts,
  addProduct,
  updateProduct,
  removeProduct,
  setLoading,
  setError,
} = productsSlice.actions;

export default productsSlice.reducer;
