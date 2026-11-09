// TECHMED Student Password Validation & Requirements Engine
// Provides real-time validation, student-friendly checklist indicators,
// and friendly error mapping for Nigerian secondary school candidates.

export interface PasswordRuleState {
  id: 'length' | 'upper' | 'lower' | 'number' | 'special';
  label: string;
  hint: string;
  isValid: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  rules: PasswordRuleState[];
  rulesMap: Record<PasswordRuleState['id'], PasswordRuleState>;
  satisfiedCount: number;
  totalCount: number;
  missingLabels: string[];
}

export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

/**
 * Validates a password against all 5 TECHMED student security requirements.
 */
export function validatePassword(password: string = ''): PasswordValidationResult {
  const str = typeof password === 'string' ? password : '';

  const rules: PasswordRuleState[] = [
    {
      id: 'length',
      label: 'At least 8 characters',
      hint: 'Make your password 8 or more characters long',
      isValid: str.length >= 8,
    },
    {
      id: 'upper',
      label: 'At least one uppercase letter (A–Z)',
      hint: 'Include at least one capital letter',
      isValid: /[A-Z]/.test(str),
    },
    {
      id: 'lower',
      label: 'At least one lowercase letter (a–z)',
      hint: 'Include at least one small letter',
      isValid: /[a-z]/.test(str),
    },
    {
      id: 'number',
      label: 'At least one number (0–9)',
      hint: 'Include at least one number digit',
      isValid: /[0-9]/.test(str),
    },
    {
      id: 'special',
      label: 'At least one special character (e.g. @, #, $, !)',
      hint: 'Include a symbol like @, #, $, or !',
      isValid: SPECIAL_CHAR_REGEX.test(str),
    },
  ];

  const satisfiedCount = rules.filter(r => r.isValid).length;
  const totalCount = rules.length;
  const isValid = satisfiedCount === totalCount;
  const missingLabels = rules.filter(r => !r.isValid).map(r => r.label);

  const rulesMap: Record<PasswordRuleState['id'], PasswordRuleState> = {
    length: rules[0],
    upper: rules[1],
    lower: rules[2],
    number: rules[3],
    special: rules[4],
  };

  return {
    isValid,
    rules,
    rulesMap,
    satisfiedCount,
    totalCount,
    missingLabels,
  };
}

/**
 * Checks if confirmation password matches the primary password.
 */
export function validatePasswordMatch(password: string, confirmPassword: string): {
  isMatch: boolean;
  matches: boolean;
  isEmpty: boolean;
  message: string;
} {
  const p = password || '';
  const c = confirmPassword || '';

  if (!c) {
    return {
      isMatch: false,
      matches: false,
      isEmpty: true,
      message: 'Please re-enter your password to confirm.',
    };
  }

  if (p === c) {
    return {
      isMatch: true,
      matches: true,
      isEmpty: false,
      message: 'Passwords match',
    };
  }

  return {
    isMatch: false,
    matches: false,
    isEmpty: false,
    message: 'Passwords do not match yet. Please double-check.',
  };
}

/**
 * Maps raw Supabase Auth or network errors into clear, friendly guidance
 * written specifically for Nigerian secondary school students.
 */
export function getFriendlyAuthErrorMessage(rawError: string | null | undefined): string {
  if (!rawError) return 'An unexpected issue occurred. Please try again.';

  const lower = rawError.toLowerCase();

  // Password policy & complexity
  if (
    lower.includes('password should contain') ||
    lower.includes('password should be at least') ||
    lower.includes('character of each')
  ) {
    return 'Your password must have at least 8 characters, with at least one uppercase letter (A–Z), one lowercase letter (a–z), one number (0–9), and one special character (e.g. @, #, $, !).';
  }
  if (lower.includes('signup requires a valid password') || lower.includes('weak password') || lower.includes('pwned')) {
    return 'Please create a stronger password that meets all 5 requirements in the checklist.';
  }

  // Duplicate / existing user
  if (
    lower.includes('user already registered') ||
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('email already in use')
  ) {
    return 'An account with this email address already exists. Please sign in instead, or click "Reset Password" if you forgot your password.';
  }

  // Credentials & Login
  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Incorrect email or password. Please verify your spelling and try again.';
  }

  // Unconfirmed email
  if (lower.includes('email not confirmed')) {
    return 'Your email address is not verified yet. Please check your inbox (and spam folder) for the confirmation link.';
  }

  // Rate limiting
  if (lower.includes('rate limit') || lower.includes('over_email_send_rate_limit') || lower.includes('too many requests')) {
    return 'Too many attempts in a short time. For your security, please wait 60 seconds before trying again.';
  }

  // Connection & Network
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('networkerror')) {
    return 'Could not connect to TECHMED servers. Please check your internet connection and try again.';
  }

  // Generic clean fallback
  return rawError.length > 120 ? 'Could not complete registration. Please check your details and try again.' : rawError;
}

export interface PasswordChecklistBindingOptions {
  // Can pass elements OR IDs
  passwordInput?: HTMLInputElement | null;
  passwordInputId?: string;
  prefix?: string; // e.g. "reg-req-" or "np-req-"
  ruleElementIds?: Record<PasswordRuleState['id'], string>;
  badgeEl?: HTMLElement | null;
  badgeId?: string;
  cardId?: string;
  confirmInput?: HTMLInputElement | null;
  confirmInputId?: string;
  matchStatusEl?: HTMLElement | null;
  matchIndicatorId?: string;
  matchIconEl?: HTMLElement | null;
  matchLabelEl?: HTMLElement | null;
  togglePasswordBtn?: HTMLElement | null;
  togglePasswordBtnId?: string;
  toggleConfirmBtn?: HTMLElement | null;
  toggleConfirmBtnId?: string;
  onValidationChange?: (
    res: PasswordValidationResult,
    match: { isMatch: boolean; matches: boolean; isEmpty: boolean }
  ) => void;
}

/**
 * Initializes and binds real-time DOM events for a password input,
 * its requirements checklist items, and optional confirmation input.
 */
export function initPasswordChecklist(opts: PasswordChecklistBindingOptions): {
  validate: () => PasswordValidationResult;
  checkMatch: () => { isMatch: boolean; matches: boolean; isEmpty: boolean; message: string };
} {
  const passwordInput =
    opts.passwordInput ||
    (opts.passwordInputId ? (document.getElementById(opts.passwordInputId) as HTMLInputElement | null) : null);

  const confirmInput =
    opts.confirmInput ||
    (opts.confirmInputId ? (document.getElementById(opts.confirmInputId) as HTMLInputElement | null) : null);

  const badgeEl =
    opts.badgeEl ||
    (opts.badgeId ? document.getElementById(opts.badgeId) : null);

  const matchStatusEl =
    opts.matchStatusEl ||
    (opts.matchIndicatorId ? document.getElementById(opts.matchIndicatorId) : null);

  const togglePasswordBtn =
    opts.togglePasswordBtn ||
    (opts.togglePasswordBtnId ? document.getElementById(opts.togglePasswordBtnId) : null);

  const toggleConfirmBtn =
    opts.toggleConfirmBtn ||
    (opts.toggleConfirmBtnId ? document.getElementById(opts.toggleConfirmBtnId) : null);

  const matchIconEl = opts.matchIconEl;
  const matchLabelEl = opts.matchLabelEl;
  const prefix = opts.prefix || '';
  const ruleElementIds = opts.ruleElementIds;
  const onValidationChange = opts.onValidationChange;

  function getItemElement(ruleId: PasswordRuleState['id']): HTMLElement | null {
    if (ruleElementIds && ruleElementIds[ruleId]) {
      return document.getElementById(ruleElementIds[ruleId]);
    }
    if (prefix) {
      return document.getElementById(`${prefix}${ruleId}`);
    }
    return null;
  }

  function updateChecklist(): PasswordValidationResult {
    const pw = passwordInput?.value || '';
    const res = validatePassword(pw);

    res.rules.forEach(rule => {
      const itemEl = getItemElement(rule.id);
      if (!itemEl) return;

      if (rule.isValid) {
        itemEl.classList.add('satisfied');
        itemEl.setAttribute('aria-checked', 'true');
      } else {
        itemEl.classList.remove('satisfied');
        itemEl.setAttribute('aria-checked', 'false');
      }
    });

    if (badgeEl) {
      badgeEl.textContent = `${res.satisfiedCount} of ${res.totalCount} satisfied`;
      if (res.isValid) {
        badgeEl.classList.add('all-satisfied');
      } else {
        badgeEl.classList.remove('all-satisfied');
      }
    }

    return res;
  }

  function updateMatch(): { isMatch: boolean; matches: boolean; isEmpty: boolean; message: string } {
    const pw = passwordInput?.value || '';
    const confirmVal = confirmInput?.value || '';

    if (!confirmInput || !matchStatusEl) {
      return { isMatch: true, matches: true, isEmpty: true, message: '' };
    }

    if (!confirmVal) {
      matchStatusEl.style.display = 'none';
      matchStatusEl.className = 'match-indicator';
      return { isMatch: false, matches: false, isEmpty: true, message: '' };
    }

    const matchRes = validatePasswordMatch(pw, confirmVal);
    matchStatusEl.style.display = 'flex';

    if (matchRes.isMatch) {
      matchStatusEl.className = 'match-indicator matched';
      if (matchLabelEl) {
        matchLabelEl.textContent = 'Passwords match';
      } else {
        matchStatusEl.textContent = '✓ Passwords match';
      }
      if (matchIconEl) {
        matchIconEl.innerHTML =
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      }
    } else {
      matchStatusEl.className = 'match-indicator mismatched';
      if (matchLabelEl) {
        matchLabelEl.textContent = 'Passwords do not match yet';
      } else {
        matchStatusEl.textContent = '✕ Passwords do not match yet';
      }
      if (matchIconEl) {
        matchIconEl.innerHTML =
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
      }
    }

    return matchRes;
  }

  function handleInput() {
    const v = updateChecklist();
    const m = updateMatch();
    if (onValidationChange) {
      onValidationChange(v, m);
    }
  }

  passwordInput?.addEventListener('input', handleInput);
  confirmInput?.addEventListener('input', handleInput);

  function setupToggle(btn: HTMLElement | null, input: HTMLInputElement | null) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');

      const eyeShow = btn.querySelector('.eye-show') as HTMLElement | null;
      const eyeHide = btn.querySelector('.eye-hide') as HTMLElement | null;
      if (eyeShow && eyeHide) {
        eyeShow.style.display = isPassword ? 'none' : 'block';
        eyeHide.style.display = isPassword ? 'block' : 'none';
      }
    });
  }

  setupToggle(togglePasswordBtn, passwordInput);
  setupToggle(toggleConfirmBtn, confirmInput);

  // Initial trigger if input already has value (e.g. browser autofill)
  if (passwordInput?.value) {
    handleInput();
  }

  return {
    validate: updateChecklist,
    checkMatch: updateMatch,
  };
}
