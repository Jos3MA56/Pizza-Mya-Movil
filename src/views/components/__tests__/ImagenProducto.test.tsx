import React from 'react';
import { describe, test, expect } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import { ImagenProducto } from '../ImagenProducto';

describe('Imagen de producto', () => {
  test('renderiza la URL y muestra alternativa cuando falla; recupera al cambiar de presentación', async () => {
    const vista = await render(<ImagenProducto url="https://example.com/mediana.png" nombre="Hawaiana" />);
    expect(vista.getByLabelText('Imagen de Hawaiana').props.source.uri).toBe('https://example.com/mediana.png');
    await fireEvent(vista.getByLabelText('Imagen de Hawaiana'), 'error');
    expect(vista.getByLabelText('Imagen no disponible de Hawaiana')).toBeTruthy();
    await vista.rerender(<ImagenProducto url="https://example.com/grande.png" nombre="Hawaiana" />);
    expect(vista.getByLabelText('Imagen de Hawaiana').props.source.uri).toBe('https://example.com/grande.png');
  }, 15000);
});
