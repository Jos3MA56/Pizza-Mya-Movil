export interface CategoriaCatalogo {
  id: string;
  nombre: string;
  orden: number;
}

export interface TamanioCatalogo {
  productoId?: string;
  imagenUrl?: string;
  id: string;
  tamanioId: string;
  nombre: string;
  precio: number;
}

export interface ProductoCatalogo {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcion: string;
  imagenUrl?: string;
  tamanios: TamanioCatalogo[];
}

export interface Catalogo {
  categorias: CategoriaCatalogo[];
  productos: ProductoCatalogo[];
}
