// ============================================
// MERCADITO ONLINE PY - E2E TESTS
// Tests end-to-end para funcionalidades principales
// ============================================

import { test, expect } from '@playwright/test';

test.describe('Mercadito Online PY - E2E Tests', () => {
  
  test('Página principal carga correctamente', async ({ page }) => {
    await page.goto('/');
    
    // Verificar elementos principales
    await expect(page.locator('h1')).toContainText('Mercadito Online PY');
    await expect(page.locator('text=Productos')).toBeVisible();
    
    // Verificar que no hay errores de consola
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('Navegación a productos funciona', async ({ page }) => {
    await page.goto('/');
    
    // Buscar un producto y hacer clic
    const productLink = page.locator('a[href*="/products/"]').first();
    await expect(productLink).toBeVisible();
    
    await productLink.click();
    await expect(page).toHaveURL(/\/products\/[a-f0-9-]+/);
    
    // Verificar elementos de la página de producto
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Precio')).toBeVisible();
    await expect(page.locator('text=Agregar al carrito')).toBeVisible();
  });

  test('Sistema de autenticación', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Verificar elementos del formulario
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Verificar enlaces
    await expect(page.locator('text=¿No tienes cuenta?')).toBeVisible();
  });

  test('Dashboard de vendedor', async ({ page }) => {
    // Nota: Este test requeriría autenticación real
    await page.goto('/dashboard');
    
    // Verificar redirección a login si no está autenticado
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('Sistema de búsqueda', async ({ page }) => {
    await page.goto('/search');
    
    // Verificar elementos de búsqueda
    await expect(page.locator('input[type="search"]')).toBeVisible();
    await expect(page.locator('text=Categorías')).toBeVisible();
    await expect(page.locator('text=Precio')).toBeVisible();
  });

  test('Responsive design en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Verificar que el header se adapta
    await expect(page.locator('header')).toBeVisible();
    
    // Verificar que el menú móvil funciona
    const menuButton = page.locator('button[aria-label*="menu"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await expect(page.locator('nav')).toBeVisible();
    }
  });

  test('SEO y metadatos', async ({ page }) => {
    await page.goto('/');
    
    // Verificar metadatos básicos
    const title = await page.title();
    expect(title).toContain('Mercadito Online PY');
    
    // Verificar meta description
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeTruthy();
    
    // Verificar Open Graph
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
  });

  test('Sitemap y robots.txt', async ({ page }) => {
    // Verificar sitemap
    const sitemapResponse = await page.request.get('/sitemap.xml');
    expect(sitemapResponse.status()).toBe(200);
    
    // Verificar robots.txt
    const robotsResponse = await page.request.get('/robots.txt');
    expect(robotsResponse.status()).toBe(200);
  });

  test('Performance básico', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que la página carga en menos de 3 segundos
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('Accesibilidad básica', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que hay elementos con roles semánticos
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    
    // Verificar que las imágenes tienen alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });
});
