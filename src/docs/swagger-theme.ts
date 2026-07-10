/**
 * Custom look and feel for the Swagger UI page served at /docs.
 * Injected through SwaggerModule's `customCss` option.
 */
export const swaggerCustomCss = `
  /* hide the default Swagger top bar */
  .swagger-ui .topbar { display: none; }

  body { background: #f6f8fb; }

  .swagger-ui,
  .swagger-ui .opblock-summary-description,
  .swagger-ui .opblock-description-wrapper p,
  .swagger-ui .info li, .swagger-ui .info p, .swagger-ui .info table {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
  }

  /* header */
  .swagger-ui .info { margin: 36px 0 12px; }
  .swagger-ui .info .title {
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #111827;
  }
  .swagger-ui .info .title small.version-stamp { background-color: #16a34a; }
  .swagger-ui .info .description { max-width: 72ch; color: #374151; }

  /* authorize button */
  .swagger-ui .scheme-container {
    background: transparent;
    box-shadow: none;
    padding: 0;
    margin: 0 0 8px;
  }
  .swagger-ui .btn.authorize {
    border-radius: 10px;
    border-color: #16a34a;
    color: #15803d;
    padding: 8px 20px;
  }
  .swagger-ui .btn.authorize svg { fill: #15803d; }

  /* endpoint groups */
  .swagger-ui .opblock-tag {
    font-size: 19px;
    font-weight: 700;
    color: #111827;
    border-bottom: 1px solid #e5e7eb;
    padding: 12px 8px;
  }
  .swagger-ui .opblock-tag small { color: #6b7280; font-weight: 400; }

  /* endpoint cards */
  .swagger-ui .opblock {
    border: none;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(17, 24, 39, 0.08);
    margin-bottom: 12px;
  }
  .swagger-ui .opblock .opblock-summary { padding: 10px 14px; }
  .swagger-ui .opblock .opblock-summary-method {
    border-radius: 8px;
    font-weight: 700;
    min-width: 84px;
  }
  .swagger-ui .opblock .opblock-summary-path {
    font-size: 15px;
    font-weight: 600;
  }

  /* execute / clear buttons */
  .swagger-ui .btn.execute { border-radius: 10px; }
  .swagger-ui .btn { border-radius: 10px; }

  /* filter box */
  .swagger-ui .filter-container .operation-filter-input {
    border: 1px solid #d1d5db;
    border-radius: 10px;
    padding: 8px 12px;
  }

  /* schemas section */
  .swagger-ui section.models {
    border: none;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(17, 24, 39, 0.08);
  }
  .swagger-ui section.models .model-container {
    border-radius: 8px;
    background: #f9fafb;
  }
`;
