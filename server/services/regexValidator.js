/**
 * Intelligent API Security Platform - Reusable Regex Validation Engine
 * Validates HTTP methods, endpoints, client IDs, headers, parameters, email formats, and body schemas.
 */

// Regular Expression Patterns
const PATTERNS = {
  // HTTP Methods: RFC compliant common REST methods
  HTTP_METHOD: /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/,
  
  // Endpoint format: Must start with / or /api/ and contain valid URL path segments
  ENDPOINT_FORMAT: /^\/(api\/)?[a-zA-Z0-9_\-]+(\/[a-zA-Z0-9_\-]+)*\/?$/,
  
  // Client ID format: 3 to 32 alphanumeric characters, dashes, or underscores
  CLIENT_ID: /^[a-zA-Z0-9_\-]{3,32}$/,
  
  // RFC 5322 compliant practical Email regex
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Positive integer or numeric parameters
  NUMERIC_INTEGER: /^\d+$/,
  NUMERIC_DECIMAL: /^-?\d+(\.\d+)?$/,
  
  // UUID v4 format
  UUID: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  
  // Content-Type: application/json (with optional charset)
  CONTENT_TYPE_JSON: /^application\/json(\s*;\s*charset=[a-zA-Z0-9\-]+)?$/i,
  
  // Authorization Bearer token pattern
  BEARER_AUTH: /^Bearer\s+[a-zA-Z0-9\-_.]+(\.[a-zA-Z0-9\-_.]+)*$/,
  
  // Alphanumeric search queries (preventing typical SQLi/command injection markers)
  SAFE_STRING: /^[a-zA-Z0-9\s._\-@#+=%]*$/,
  
  // Dangerous patterns for malformed or suspicious detection
  SUSPICIOUS_PAYLOAD: /(\b(union|select|insert|delete|drop|update|exec|script|<script>|<\/script>|\.\.\/|\.\.\\)\b)/i,
};

/**
 * 1. Validate HTTP Method
 */
function validateMethod(method) {
  if (!method || typeof method !== 'string') {
    return {
      rule: 'HTTP_METHOD_RULE',
      valid: false,
      message: 'HTTP method is required and must be a string.',
      reason: `Received method: "${method}"`,
    };
  }

  const upper = method.trim().toUpperCase();
  const valid = PATTERNS.HTTP_METHOD.test(upper);
  return {
    rule: 'HTTP_METHOD_RULE',
    valid,
    message: valid
      ? `HTTP method "${upper}" is valid.`
      : `HTTP method "${upper}" is invalid or unsupported. Must be GET, POST, PUT, DELETE, PATCH, HEAD, or OPTIONS.`,
    reason: valid ? 'Passed standard HTTP method syntax check.' : 'Method syntax does not match RFC specifications.',
    normalizedMethod: upper,
  };
}

/**
 * 2. Validate Endpoint URL format
 */
function validateEndpoint(endpoint) {
  if (!endpoint || typeof endpoint !== 'string') {
    return {
      rule: 'ENDPOINT_FORMAT_RULE',
      valid: false,
      message: 'API endpoint is required and must be a string.',
      reason: `Received endpoint: "${endpoint}"`,
    };
  }

  const cleanEndpoint = endpoint.trim().split('?')[0]; // Strip query parameters for endpoint path check
  const valid = PATTERNS.ENDPOINT_FORMAT.test(cleanEndpoint);
  const isSuspicious = PATTERNS.SUSPICIOUS_PAYLOAD.test(endpoint);

  if (isSuspicious) {
    return {
      rule: 'ENDPOINT_SECURITY_RULE',
      valid: false,
      message: 'Endpoint contains suspicious or malicious path traversal / injection syntax.',
      reason: `Detected potential injection or traversal sequence in endpoint: "${endpoint}"`,
    };
  }

  return {
    rule: 'ENDPOINT_FORMAT_RULE',
    valid,
    message: valid
      ? `Endpoint path "${cleanEndpoint}" conforms to API path specification.`
      : `Endpoint "${cleanEndpoint}" violates format rules. Must start with "/" and consist of valid URI segments.`,
    reason: valid
      ? 'Path format verified against standard REST URL regex.'
      : 'Contains forbidden characters, double slashes, or invalid path segments.',
    normalizedEndpoint: cleanEndpoint,
  };
}

/**
 * 3. Validate Client ID
 */
function validateClientId(clientId) {
  if (!clientId || typeof clientId !== 'string') {
    return {
      rule: 'CLIENT_ID_RULE',
      valid: false,
      message: 'Client ID is mandatory for API sequence tracking.',
      reason: 'Missing or empty Client ID.',
    };
  }

  const trimmed = clientId.trim();
  const valid = PATTERNS.CLIENT_ID.test(trimmed);

  return {
    rule: 'CLIENT_ID_RULE',
    valid,
    message: valid
      ? `Client ID "${trimmed}" is valid.`
      : `Client ID "${trimmed}" is invalid. Must be 3-32 alphanumeric characters, dashes, or underscores.`,
    reason: valid
      ? 'Client ID conforms to format ^[a-zA-Z0-9_\\-]{3,32}$'
      : 'Contains illegal characters or fails length constraint (3-32 chars).',
  };
}

/**
 * 4. Validate Email Format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return {
      rule: 'EMAIL_FORMAT_RULE',
      valid: false,
      message: 'Email address is required.',
      reason: 'Empty or non-string email provided.',
    };
  }

  const trimmed = email.trim();
  const valid = PATTERNS.EMAIL.test(trimmed);

  return {
    rule: 'EMAIL_FORMAT_RULE',
    valid,
    message: valid ? `Email "${trimmed}" is syntactically valid.` : `Email "${trimmed}" is malformed.`,
    reason: valid
      ? 'Matched RFC 5322 regex pattern.'
      : 'Failed RFC 5322 standard email address format check.',
  };
}

/**
 * 5. Validate Numeric Parameters
 */
function validateNumeric(value, paramName = 'parameter') {
  if (value === undefined || value === null || value === '') {
    return {
      rule: 'NUMERIC_PARAM_RULE',
      valid: false,
      message: `Parameter "${paramName}" is required.`,
      reason: `No value supplied for ${paramName}.`,
    };
  }

  const str = String(value).trim();
  const valid = PATTERNS.NUMERIC_INTEGER.test(str);

  return {
    rule: 'NUMERIC_PARAM_RULE',
    valid,
    message: valid ? `Parameter "${paramName}" is a valid integer.` : `Parameter "${paramName}" must be a numeric integer.`,
    reason: valid ? 'Matched integer regex ^\\d+$' : `Value "${str}" contains non-numeric characters.`,
  };
}

/**
 * 6. Validate Request Headers
 */
function validateHeaders(headers = {}, method = 'GET') {
  const results = [];
  const normalizedMethod = (method || 'GET').toUpperCase();

  // For POST and PUT, verify Content-Type header if body is provided
  if (['POST', 'PUT', 'PATCH'].includes(normalizedMethod)) {
    const contentType = headers['content-type'] || headers['Content-Type'];
    if (contentType) {
      const isJson = PATTERNS.CONTENT_TYPE_JSON.test(contentType);
      results.push({
        rule: 'HEADER_CONTENT_TYPE_RULE',
        valid: isJson,
        message: isJson
          ? 'Content-Type header is valid application/json.'
          : `Invalid Content-Type header: "${contentType}". Expected "application/json".`,
        reason: isJson ? 'Header matches application/json regex.' : 'Unrecognized or unsafe media type format.',
      });
    }
  }

  // If Authorization header is provided, validate Bearer format
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (authHeader) {
    const isBearer = PATTERNS.BEARER_AUTH.test(authHeader);
    results.push({
      rule: 'HEADER_AUTHORIZATION_RULE',
      valid: isBearer,
      message: isBearer
        ? 'Authorization header matches Bearer token format.'
        : 'Authorization header is malformed. Must follow "Bearer <token>" pattern.',
      reason: isBearer ? 'Matched Bearer auth regex.' : 'Invalid token schema or characters.',
    });
  }

  return results;
}

/**
 * 7. Validate Request Body Structure based on Endpoint
 */
function validateBodyForEndpoint(endpoint, method, body) {
  const normEndpoint = (endpoint || '').trim().toLowerCase().split('?')[0];
  const normMethod = (method || 'GET').toUpperCase();
  const errors = [];

  // Check for suspicious injection attempts in JSON body values
  if (body && typeof body === 'object') {
    const jsonString = JSON.stringify(body);
    if (PATTERNS.SUSPICIOUS_PAYLOAD.test(jsonString)) {
      errors.push({
        rule: 'BODY_INJECTION_RULE',
        valid: false,
        message: 'Payload body contains potentially malicious injection keywords or script tags.',
        reason: 'Detected SQLi or XSS patterns in request body values.',
      });
    }
  }

  // Endpoint: /api/login (POST)
  if (normEndpoint.endsWith('/login') && normMethod === 'POST') {
    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      errors.push({
        rule: 'BODY_SCHEMA_RULE',
        valid: false,
        message: 'Login request requires a JSON body with "email" and "password".',
        reason: 'Empty or missing request body.',
      });
    } else {
      if (!body.email) {
        errors.push({
          rule: 'BODY_FIELD_EMAIL_RULE',
          valid: false,
          message: 'Missing required field "email" in login body.',
          reason: 'Field "email" was not provided.',
        });
      } else {
        const emailCheck = validateEmail(body.email);
        if (!emailCheck.valid) {
          errors.push(emailCheck);
        }
      }

      if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
        errors.push({
          rule: 'BODY_FIELD_PASSWORD_RULE',
          valid: false,
          message: 'Missing or weak "password" in login body. Must be at least 6 characters.',
          reason: 'Password length is below minimum requirement.',
        });
      }
    }
  }

  // Endpoint: /api/data (PUT)
  if (normEndpoint.endsWith('/data') && normMethod === 'PUT') {
    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      errors.push({
        rule: 'BODY_SCHEMA_RULE',
        valid: false,
        message: 'Update request requires payload data.',
        reason: 'Request body is empty.',
      });
    } else {
      // Check for expected payload structure
      if (!body.payload && !body.record && !body.data && !body.settings) {
        errors.push({
          rule: 'BODY_FIELD_DATA_RULE',
          valid: false,
          message: 'Update payload must contain a valid dataset object (e.g., "data", "payload", "record").',
          reason: 'Missing data container object in update payload.',
        });
      }
    }
  }

  return errors;
}

/**
 * Master Validation Runner
 * Validates request object against all regex criteria
 */
function validateApiRequest({ method, endpoint, clientId, headers = {}, params = {}, body = null }) {
  const results = [];

  // 1. Method Check
  const methodResult = validateMethod(method);
  results.push(methodResult);

  // 2. Endpoint Check
  const endpointResult = validateEndpoint(endpoint);
  results.push(endpointResult);

  // 3. Client ID Check
  const clientIdResult = validateClientId(clientId);
  results.push(clientIdResult);

  // 4. Headers Check
  const headerResults = validateHeaders(headers, method);
  results.push(...headerResults);

  // 5. Query Parameters Check (if any supplied)
  if (params && typeof params === 'object') {
    for (const [key, val] of Object.entries(params)) {
      if (['page', 'limit', 'id', 'offset'].includes(key.toLowerCase())) {
        results.push(validateNumeric(val, key));
      } else if (typeof val === 'string' && PATTERNS.SUSPICIOUS_PAYLOAD.test(val)) {
        results.push({
          rule: 'PARAM_SECURITY_RULE',
          valid: false,
          message: `Query parameter "${key}" contains suspicious characters or injection markers.`,
          reason: `Detected suspicious string in parameter value: "${val}"`,
        });
      }
    }
  }

  // 6. Body Check
  const bodyResults = validateBodyForEndpoint(endpoint, method, body);
  results.push(...bodyResults);

  // Summarize Results
  const failedRules = results.filter((r) => !r.valid);
  const isValid = failedRules.length === 0;

  return {
    isValid,
    regexStatus: isValid ? 'VALID' : 'INVALID',
    totalChecks: results.length,
    passedChecks: results.length - failedRules.length,
    failedChecks: failedRules.length,
    results,
    errors: failedRules.map((f) => ({ rule: f.rule, message: f.message, reason: f.reason })),
    explanation: isValid
      ? 'All Regular Expression validation criteria passed (method, endpoint, client ID, headers, and body schema).'
      : `Regex validation failed on ${failedRules.length} rule(s): ${failedRules.map((f) => f.rule).join(', ')}.`,
  };
}

module.exports = {
  PATTERNS,
  validateMethod,
  validateEndpoint,
  validateClientId,
  validateEmail,
  validateNumeric,
  validateHeaders,
  validateBodyForEndpoint,
  validateApiRequest,
};
