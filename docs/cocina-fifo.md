# Cocina por renglones

Al entrar a Cocina se elige Pizzas o Complementos. El botón **Estaciones** y la opción **Cambiar estación** del menú permiten regresar al selector.

Cada estación muestra una sola lista numerada según el orden de recepción del POS. Los productos nuevos se agregan al final. Cada renglón incluye cantidad, tamaño, destino, folio y notas disponibles.

- **Blanco · Entrada.** El producto acaba de llegar.
- **Naranja · En preparación.** Toca dos veces el renglón para iniciar la preparación.
- **Verde · Lista.** Vuelve a tocarlo dos veces cuando el producto esté servido o empacado. El renglón conserva su posición en la lista.

El segundo toque debe llegar en menos de 400 ms. La pantalla consulta el POS cada tres segundos y el menú permite actualizar manualmente. El POS guarda el estado, la versión y el orden de cada renglón y rechaza actualizaciones duplicadas, versiones antiguas y productos cancelados.

Para probar, inicia el servidor POS actualizado y vincula el celular desde Perfil. Envía productos a ambas estaciones y comprueba que cada lista muestre sus propios renglones.
