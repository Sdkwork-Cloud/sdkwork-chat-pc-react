class EventEmitter {
  private events = new Map<string, Function[]>();

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(listener);
    return this;
  }

  off(event: string, listener: Function): this {
    const listeners = this.events.get(event);
    if (!listeners) {
      return this;
    }
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) {
      return false;
    }
    for (const listener of listeners) {
      listener(...args);
    }
    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  value: any;
}

export interface PasswordStrengthResult {
  score: number;
  strength: "weak" | "fair" | "good" | "strong" | "excellent";
  errors: string[];
  suggestions: string[];
}

export interface ContentSecurityPolicy {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  styleSrcElem?: string[];
  imgSrc?: string[];
  fontSrc?: string[];
  connectSrc?: string[];
  mediaSrc?: string[];
  objectSrc?: string[];
  frameSrc?: string[];
  formAction?: string[];
  baseUri?: string[];
  reportUri?: string;
  reportOnly?: boolean;
}

const CSP_DIRECTIVE_MAP: Record<
  Exclude<keyof ContentSecurityPolicy, "reportUri" | "reportOnly">,
  string
> = {
  defaultSrc: "default-src",
  scriptSrc: "script-src",
  styleSrc: "style-src",
  styleSrcElem: "style-src-elem",
  imgSrc: "img-src",
  fontSrc: "font-src",
  connectSrc: "connect-src",
  mediaSrc: "media-src",
  objectSrc: "object-src",
  frameSrc: "frame-src",
  formAction: "form-action",
  baseUri: "base-uri",
};

export interface SecurityVulnerability {
  id: string;
  type:
    | "xss"
    | "csrf"
    | "injection"
    | "auth"
    | "sensitive-data"
    | "broken-access"
    | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  location: string;
  remediation: string;
  evidence?: string;
}

export interface SecurityScanResult {
  timestamp: number;
  duration: number;
  vulnerabilities: SecurityVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const DANGEROUS_ATTRIBUTES = [
  "onload",
  "onerror",
  "onclick",
  "onmouseover",
  "onfocus",
  "onblur",
];

const SENSITIVE_PATTERNS: RegExp[] = [
  /token|secret|password|key|auth|session|credential/i,
  /\b[A-Fa-f0-9]{32}\b/,
  /\b[A-Fa-f0-9]{40}\b/,
  /\b[A-Fa-f0-9]{64}\b/,
];

export class SecurityService extends EventEmitter {
  private static instance: SecurityService;
  private csrfToken: string | null = null;
  private isInitialized = false;

  private constructor() {
    super();
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.generateCsrfToken();
    this.setupSecurityHeaders();
    this.setContentSecurityPolicy(
      {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        styleSrcElem: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
        mediaSrc: ["'self'", "blob:", "https:"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
      },
      { onlyIfMissing: true },
    );

    this.isInitialized = true;
    console.log("[SecurityService] Initialized");
  }

  validate(value: any, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];

    if (rules.required && !this.isValuePresent(value)) {
      errors.push(rules.message || "This field is required.");
    }

    if (
      typeof rules.minLength === "number" &&
      this.getValueLength(value) < rules.minLength
    ) {
      errors.push(
        rules.message || `Length must be at least ${rules.minLength} characters.`,
      );
    }

    if (
      typeof rules.maxLength === "number" &&
      this.getValueLength(value) > rules.maxLength
    ) {
      errors.push(
        rules.message || `Length must be no more than ${rules.maxLength} characters.`,
      );
    }

    if (
      rules.pattern &&
      typeof value === "string" &&
      value.length > 0 &&
      !rules.pattern.test(value)
    ) {
      errors.push(rules.message || "Input format is invalid.");
    }

    if (rules.custom && !rules.custom(value)) {
      errors.push(rules.message || "Input validation failed.");
    }

    return {
      isValid: errors.length === 0,
      errors,
      value,
    };
  }

  validateBatch(
    data: Record<string, any>,
    rules: Record<string, ValidationRule>,
  ): Record<string, ValidationResult> {
    const result: Record<string, ValidationResult> = {};
    Object.entries(rules).forEach(([field, fieldRules]) => {
      result[field] = this.validate(data[field], fieldRules);
    });
    return result;
  }

  validatePasswordStrength(password: string): PasswordStrengthResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters.");
    } else if (password.length >= 12) {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must include a lowercase letter.");
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must include an uppercase letter.");
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      errors.push("Password must include a number.");
    } else {
      score += 1;
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push("Password must include one special character (@$!%*?&).");
    } else {
      score += 1;
    }

    if (password.length < 12) {
      suggestions.push("Use at least 12 characters for stronger security.");
    }
    if (!/[^A-Za-z\d@$!%*?&]/.test(password)) {
      suggestions.push("Add other special symbols to improve complexity.");
    }
    if (!/[0-9]{2,}/.test(password)) {
      suggestions.push("Use more than one number.");
    }
    if (!/[A-Z]{2,}/.test(password)) {
      suggestions.push("Use more than one uppercase letter.");
    }

    const cappedScore = Math.min(score, 4);
    let strength: PasswordStrengthResult["strength"] = "weak";
    switch (cappedScore) {
      case 0:
      case 1:
        strength = "weak";
        break;
      case 2:
        strength = "fair";
        break;
      case 3:
        strength = "good";
        break;
      case 4:
        strength = errors.length === 0 ? "excellent" : "strong";
        break;
      default:
        strength = "weak";
    }

    return {
      score: cappedScore,
      strength,
      errors,
      suggestions,
    };
  }

  sanitizeInput(input: string): string {
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML;
  }

  sanitizeHtml(
    html: string,
    allowedTags: string[] = ["b", "i", "u", "strong", "em", "br", "p"],
  ): string {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const recursivelySanitize = (node: Node) => {
      for (let i = 0; i < node.childNodes.length; i += 1) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
          const element = child as Element;
          if (!allowedTags.includes(element.tagName.toLowerCase())) {
            const textNode = document.createTextNode(element.textContent || "");
            node.replaceChild(textNode, child);
            i -= 1;
            continue;
          }

          for (let j = element.attributes.length - 1; j >= 0; j -= 1) {
            element.removeAttribute(element.attributes[j].name);
          }
          recursivelySanitize(child);
        }
      }
    };

    recursivelySanitize(tempDiv);
    return tempDiv.innerHTML;
  }

  generateCsrfToken(): string {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 17)}-${Math.random()
      .toString(36)
      .slice(2, 17)}`;
    this.csrfToken = token;
    localStorage.setItem("csrf_token", token);
    return token;
  }

  getCsrfToken(): string {
    if (!this.csrfToken) {
      this.csrfToken =
        localStorage.getItem("csrf_token") || this.generateCsrfToken();
    }
    return this.csrfToken;
  }

  validateCsrfToken(token: string): boolean {
    return token === this.getCsrfToken();
  }

  generateContentSecurityPolicy(policy: ContentSecurityPolicy = {}): string {
    const defaultPolicy: ContentSecurityPolicy = {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      mediaSrc: ["'self'", "blob:", "https:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      ...policy,
    };

    const directives = Object.entries(defaultPolicy)
      .filter(([, value]) => value !== undefined)
      .flatMap(([directive, value]) => {
        if (directive === "reportOnly") {
          return [];
        }
        if (directive === "reportUri") {
          return [`report-uri ${value}`];
        }
        const mapped = CSP_DIRECTIVE_MAP[
          directive as keyof typeof CSP_DIRECTIVE_MAP
        ];
        if (!mapped) {
          return [];
        }
        return [`${mapped} ${(value as string[]).join(" ")}`];
      });

    return directives.join("; ");
  }

  setContentSecurityPolicy(
    policy: ContentSecurityPolicy = {},
    options: { onlyIfMissing?: boolean } = {},
  ): void {
    const cspHeader = this.generateContentSecurityPolicy(policy);
    const existingTags = document.querySelectorAll(
      'meta[http-equiv="Content-Security-Policy"]',
    );

    if (options.onlyIfMissing && existingTags.length > 0) {
      return;
    }

    const metaTag = document.createElement("meta");
    metaTag.httpEquiv = "Content-Security-Policy";
    metaTag.content = cspHeader;

    existingTags.forEach((tag) => tag.remove());
    document.head.appendChild(metaTag);
    this.emit("cspUpdated", cspHeader);
  }

  setupSecurityHeaders(): void {
    const headers = [
      {
        name: "Referrer-Policy",
        content: "strict-origin-when-cross-origin",
      },
      {
        name: "Permissions-Policy",
        content: "camera=(), microphone=(), geolocation=()",
      },
    ];

    headers.forEach((header) => {
      const existing = document.querySelectorAll(
        `meta[http-equiv="${header.name}"]`,
      );
      existing.forEach((tag) => tag.remove());

      const metaTag = document.createElement("meta");
      metaTag.httpEquiv = header.name;
      metaTag.content = header.content;
      document.head.appendChild(metaTag);
    });

    this.emit("securityHeadersUpdated", headers);
  }

  validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validatePhone(phone: string): boolean {
    return /^1[3-9]\d{9}$/.test(phone);
  }

  generateSecureRandomString(length = 32): string {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const randomBytes = new Uint8Array(length);
    window.crypto.getRandomValues(randomBytes);

    let result = "";
    for (let i = 0; i < length; i += 1) {
      result += charset[randomBytes[i] % charset.length];
    }
    return result;
  }

  async hashData(data: string): Promise<string> {
    const encoded = new TextEncoder().encode(data);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  getSecurityStats() {
    return {
      csrfToken: this.csrfToken ? "set" : "not set",
      initialized: this.isInitialized,
      timestamp: Date.now(),
    };
  }

  async scanSecurityVulnerabilities(): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [
      ...this.scanForXSSVulnerabilities(),
      ...this.scanForSensitiveDataExposure(),
      ...this.scanForCSPIssues(),
      ...this.scanForAuthIssues(),
      ...this.scanForUrlVulnerabilities(),
    ];

    const duration = Date.now() - startTime;
    const summary = {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter((item) => item.severity === "critical")
        .length,
      high: vulnerabilities.filter((item) => item.severity === "high").length,
      medium: vulnerabilities.filter((item) => item.severity === "medium")
        .length,
      low: vulnerabilities.filter((item) => item.severity === "low").length,
    };

    const result: SecurityScanResult = {
      timestamp: Date.now(),
      duration,
      vulnerabilities,
      summary,
    };

    this.emit("securityScanComplete", result);
    return result;
  }

  private scanForXSSVulnerabilities(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const elements = document.querySelectorAll("*");

    elements.forEach((element, index) => {
      DANGEROUS_ATTRIBUTES.forEach((attr) => {
        if (element.hasAttribute(attr)) {
          vulnerabilities.push({
            id: `xss-attr-${index}-${attr}`,
            type: "xss",
            severity: "high",
            description: `Dangerous inline handler detected: ${attr}`,
            location: `${element.tagName.toLowerCase()}[${attr}]`,
            remediation: "Remove inline event handlers and use safe listeners.",
            evidence: element.outerHTML,
          });
        }
      });
    });

    const links = document.querySelectorAll("a[href], iframe[src], script[src]");
    links.forEach((link, index) => {
      const url = link.getAttribute("href") || link.getAttribute("src");
      if (url && (url.startsWith("javascript:") || url.includes("data:text/html"))) {
        vulnerabilities.push({
          id: `xss-url-${index}`,
          type: "xss",
          severity: "critical",
          description: `Potentially dangerous URL detected: ${url.slice(0, 80)}`,
          location: `${link.tagName.toLowerCase()}[${
            link.hasAttribute("href") ? "href" : "src"
          }]`,
          remediation: "Replace dangerous URL schemes with safe HTTP(S) links.",
          evidence: link.outerHTML,
        });
      }
    });

    return vulnerabilities;
  }

  private scanForSensitiveDataExposure(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) {
        continue;
      }
      const value = localStorage.getItem(key) || "";

      if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(value))) {
        vulnerabilities.push({
          id: `sensitive-${i}`,
          type: "sensitive-data",
          severity: "medium",
          description: `Potential sensitive data found in localStorage key: ${key}`,
          location: `localStorage[${key}]`,
          remediation: "Avoid storing sensitive values in localStorage.",
          evidence: `Key: ${key}, Value: ${value.slice(0, 80)}`,
        });
      }
    }

    return vulnerabilities;
  }

  private scanForCSPIssues(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const cspMetaTags = document.querySelectorAll(
      'meta[http-equiv="Content-Security-Policy"]',
    );

    if (cspMetaTags.length === 0) {
      vulnerabilities.push({
        id: "csp-missing",
        type: "other",
        severity: "medium",
        description: "Content-Security-Policy is missing.",
        location: "document.head",
        remediation: "Add a CSP header or equivalent meta tag.",
      });
      return vulnerabilities;
    }

    cspMetaTags.forEach((tag, index) => {
      const content = tag.getAttribute("content") || "";
      if (content.includes("'unsafe-eval'")) {
        vulnerabilities.push({
          id: `csp-unsafe-eval-${index}`,
          type: "xss",
          severity: "high",
          description: "CSP contains 'unsafe-eval'.",
          location: "Content-Security-Policy",
          remediation: "Remove 'unsafe-eval'.",
          evidence: content,
        });
      }
      if (content.includes("'unsafe-inline'")) {
        vulnerabilities.push({
          id: `csp-unsafe-inline-${index}`,
          type: "xss",
          severity: "medium",
          description: "CSP contains 'unsafe-inline'.",
          location: "Content-Security-Policy",
          remediation: "Use nonces or hashes instead of 'unsafe-inline'.",
          evidence: content,
        });
      }
      if (content.includes("*")) {
        vulnerabilities.push({
          id: `csp-wildcard-${index}`,
          type: "other",
          severity: "low",
          description: "CSP contains wildcard source.",
          location: "Content-Security-Policy",
          remediation: "Replace wildcard sources with explicit domains.",
          evidence: content,
        });
      }
    });

    return vulnerabilities;
  }

  private scanForAuthIssues(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (window.location.protocol !== "https:") {
      vulnerabilities.push({
        id: "auth-https",
        type: "auth",
        severity: "high",
        description: "Application is not running over HTTPS.",
        location: "window.location.protocol",
        remediation: "Serve the application through HTTPS.",
        evidence: window.location.protocol,
      });
    }

    if (!this.csrfToken) {
      vulnerabilities.push({
        id: "auth-csrf",
        type: "csrf",
        severity: "medium",
        description: "CSRF token is not initialized.",
        location: "SecurityService.csrfToken",
        remediation: "Generate and validate CSRF tokens for sensitive actions.",
      });
    }

    return vulnerabilities;
  }

  private scanForUrlVulnerabilities(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    const currentUrl = window.location.href;
    if (
      currentUrl.includes("password=") ||
      currentUrl.includes("token=") ||
      currentUrl.includes("secret=")
    ) {
      vulnerabilities.push({
        id: "url-sensitive",
        type: "sensitive-data",
        severity: "high",
        description: "Potential sensitive query parameter found in URL.",
        location: "window.location.href",
        remediation: "Do not place sensitive values in URL query parameters.",
        evidence: currentUrl,
      });
    }

    const links = document.querySelectorAll("a[href]");
    links.forEach((link, index) => {
      const href = link.getAttribute("href");
      if (!href) {
        return;
      }

      if (href.includes("javascript:") || href.includes("data:text/html")) {
        vulnerabilities.push({
          id: `url-javascript-${index}`,
          type: "xss",
          severity: "high",
          description: `Dangerous URL scheme detected: ${href.slice(0, 80)}`,
          location: "a[href]",
          remediation: "Use safe links and avoid javascript/data URL schemes.",
          evidence: href,
        });
      }

      try {
        const parsed = new URL(href, window.location.origin);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          vulnerabilities.push({
            id: `url-protocol-${index}`,
            type: "other",
            severity: "low",
            description: `Non-HTTP protocol detected: ${parsed.protocol}`,
            location: "a[href]",
            remediation: "Use HTTP(S) URLs for navigation links.",
            evidence: href,
          });
        }
      } catch {
        // Ignore malformed URLs and continue scanning.
      }
    });

    return vulnerabilities;
  }

  private isValuePresent(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  }

  private getValueLength(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === "string" || Array.isArray(value)) {
      return value.length;
    }
    if (typeof value === "object") {
      return Object.keys(value).length;
    }
    return String(value).length;
  }
}

export const securityService = SecurityService.getInstance();

export function validateInput(
  value: any,
  rules: ValidationRule,
): ValidationResult {
  return securityService.validate(value, rules);
}

export function validatePassword(password: string): PasswordStrengthResult {
  return securityService.validatePasswordStrength(password);
}

export function sanitizeInput(input: string): string {
  return securityService.sanitizeInput(input);
}

export default SecurityService;
