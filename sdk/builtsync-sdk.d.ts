/* Types for the BuiltSync module contract (SDK 1.x). Editors read this file, so a module author, human or AI, gets completion and errors for BS.sdk,
   for manifests, and for the admin and phone registrations. A module file opts in with   // @ts-check   on its first line.
   To type your module's own global, merge it into Platform in your module:   declare namespace BuiltSync { interface Platform { qaqc: import('./store').Api } } */

declare namespace BuiltSync {
  type Lang = 'zh' | 'en';
  type Op = 'view' | 'create' | 'update' | 'delete' | 'export' | 'approve';
  type Domain = 'account' | 'site' | 'qaqc' | 'platform';
  type NavGroup = 'overview' | 'people' | 'timepay' | 'site' | 'welfare' | 'engage' | 'system';
  type Slot = 'css' | 'i18n' | 'store' | 'hooks' | 'phone' | 'admin';
  type RoleCode = 'PROJECT_ADMIN' | 'FINANCE_ADMIN' | 'HR_ADMIN' | 'SUBCON_USER' | 'MAINCON_USER';
  interface Bilingual { zh: string; en: string }
  type Params = Record<string, string | number>;
  /** the result of html`...`: safe markup. Values placed in a template are escaped unless they are Html themselves. */
  interface Html { readonly s: string; toString(): string }
  type Fragment = Html | string | number | false | null | undefined | Fragment[];
  interface Subscribable { subscribe(fn: (evt: any) => void): () => void }

  // ---------- the manifest ----------
  interface Manifest {
    /** 2-16 lowercase letters or digits; also the folder name js/<id>/ */
    id: string;
    /** this module's own version, 1.0.0 */
    version: string;
    domain: Domain;
    name: Bilingual;
    description?: string;
    /** the contract version it was written for: '^1.0.0', '1.x' or '1.0.0' */
    sdk: string;
    /** true: touches the platform only through BS.sdk (enforced by tools/check-modules.js). New modules should be. */
    sdkOnly?: boolean;
    /** the property of BS that holds the module's API object (default: the id) */
    global?: string;
    /** other BS properties this module owns (helpers, data) */
    globals?: string[];
    /** hard dependencies: loaded first, may be used directly */
    requires?: string[];
    /** soft dependencies: only through BS.sdk.modules.api(id), which can be null; say why */
    uses?: Record<string, { optional: boolean; why: string }>;
    /** extension points of other modules it asks questions of */
    consumes?: string[];
    /** root-relative paths per slot, in load order */
    files: Partial<Record<Slot, string[]>>;
    nav?: { group: NavGroup; icon: string; label: string; after?: string };
    permissions?: { page: string; ops: Op[]; descKey: string; scoped?: boolean; defaults?: Partial<Record<RoleCode, Op[]>> };
    tenant?: { order: number; ready: boolean; defaultFor?: string[] };
    audit?: { module: string };
    events?: { prefix: string; emits?: string[]; listens?: string[] };
    phone?: { tiles?: { icon: string; label: string; act: string; order?: number }[] };
    /** the public API: the only methods other modules can call */
    exports?: string[];
    /** extension points this module owns; names start with '<id>.' */
    points?: Record<string, string>;
    /** extension points of other modules that it answers */
    provides?: string[];
    /** every localStorage key it writes */
    storage?: string[];
    /** the demo reset button calls BS.<global>.reset() */
    reset?: boolean;
  }

  // ---------- the people the platform knows ----------
  interface Cert { id: string; type: string; number: string; expiry: string | null; [k: string]: any }
  interface Employee { empNo: string; name: string; nameEn: string; phone: string; status: 'active' | 'disabled'; trades: string[]; country: string; joinDate: string; employer: any; assigns: { projectKey: string; siteKey: string; role: string }[]; certs: Cert[]; [k: string]: any }
  interface Project { key: string; code: string; zh: string; en: string; sites: string[]; [k: string]: any }
  interface Site { key: string; code: string; zh: string; en: string; projectKey: string; address: string; lat: number; lng: number; radius: number; [k: string]: any }
  interface AttendanceGroup { id: string; nameZh: string; nameEn: string; projectKey: string; siteKey: string; [k: string]: any }
  interface Account { id: string; name: string; nameEn: string; roleId: string; status: string; [k: string]: any }

  // ---------- the SDK ----------
  interface Store<S> {
    readonly key: string;
    readonly state: S & { v: number };
    update<R>(fn: (state: S & { v: number }) => R, evt?: any): { result: R; persisted: boolean };
    save(): boolean;
    emit(evt: any): void;
    subscribe(fn: (evt: any) => void): () => void;
    version(): number;
    reset(): void;
  }
  interface AuditSpec { module: string; type: string | ((args: any[]) => string); before?: (...args: any[]) => any; object: (args: any[], result: any, before?: any) => Bilingual | null }
  interface Sdk {
    readonly version: string;
    ui: { html(strings: TemplateStringsArray, ...values: Fragment[]): Html; raw(markup: string): Html; esc(text: unknown): string; icon(name: string, size?: number, cls?: string): Html };
    i18n: { define(key: string, zh: string, en: string): void; t(lang: Lang, key: string, params?: Params): string };
    time: { now(): string; today(): string; addDays(date: string, n: number): string };
    people: { emp(empNo: string): Employee | undefined; emps(): Employee[]; project(key: string): Project | undefined; projects(): Project[]; site(key: string): Site | undefined; sites(): Site[]; certsOf(empNo: string): Cert[]; certStatus(c: Cert): 'ok' | 'soon' | 'expired' | 'perm'; certType(code: string): any; subscribe: Subscribable['subscribe'] };
    attendance: { groups(): AttendanceGroup[]; group(id: string): AttendanceGroup | undefined; groupOf(emp: Employee): AttendanceGroup | undefined; day(empNo: string, date: string, now?: string): any; now(): string; subscribe: Subscribable['subscribe'] };
    perm: { can(page: string, op: Op): boolean; canPage(page: string): boolean; currentAccount(): Account | undefined; currentId(): string; account(id: string): Account | undefined; roleOf(acct: Account): any; subscribe: Subscribable['subscribe'] };
    me(): { empNo: string; name: string; nameEn: string; project?: string; projectEn?: string };
    audit: { watch(store: object, method: string, spec: AuditSpec): void };
    bus: { on(pattern: string, fn: (ev: { seq: number; at: string; type: string; payload: any }) => void): () => void; emit(type: string, payload?: any): void };
    modules: {
      api<T = any>(id: string): T | null; has(id: string): boolean; stores(ids: string[]): Subscribable[]; providerStores(point: string): Subscribable[];
      extend(point: string, owner: string, fn: (...args: any[]) => any): void; collect<T = any>(point: string, ...args: any[]): T[]; first<T = any>(point: string, ...args: any[]): T | undefined;
    };
    storage: { createStore<S extends object>(opts: { key: string; version?: number; seed: () => S; migrate?: (old: any, fromVersion: number) => S | null | undefined }): Store<S> };
    admin: { register(page: AdminPage): void };
    phone: { extend(ext: PhoneExtension): void };
  }

  // ---------- the admin dashboard page ----------
  interface AdminContext { host: HTMLElement; t(key: string, params?: Params): string; toast(message: string, kind?: 'ok' | 'warn' | ''): void; view(): HTMLElement; lang(): Lang; rerender(): void; go(page: string, params?: object): boolean; scrollTop0(): void }
  interface Tab { id: string; k: string; live?: boolean }
  interface AdminInstance {
    tab: string;
    crumbs(): { text: string; act?: string }[];
    page(): Html;
    modal?(): Html | string;
    afterRender?(view: HTMLElement): void;
    /** return true when the action was handled. Action names decide the permission asked: *-new/-add/-create need create; -edit/-update need update; -del/-delete/-rm need delete; -approve/-reject need approve; export needs export. */
    onClick(act: string, el: HTMLElement, evt: Event): boolean;
    onInput?(e: Event): void; onChange?(e: Event): void; onSubmit?(e: Event): void; onEscape?(): boolean; onStore?(evt: any): void; onTab?(id: string): void; onGo?(params: object): void; reset?(): void;
  }
  interface AdminPage { id: string; nav: string; stores?: Subscribable[]; tabs: Tab[] | (() => Tab[]); create(ctx: AdminContext): AdminInstance }

  // ---------- the phone ----------
  interface PhoneApi {
    root: HTMLElement; t(key: string, params?: Params): string; html: Sdk['ui']['html']; icon: Sdk['ui']['icon']; readonly lang: Lang;
    header(title: string, opts?: { back?: boolean; right?: Fragment }): Html; render(resetScroll?: boolean): void; toast(message: string, kind?: 'ok' | 'warn' | ''): void;
    /** replace the screen stack: go([{ s: 'home' }, { s: 'myscreen' }]) */ go(stack: { s: string }[]): void; push(screen: string, params?: object): void; pop?(): void;
  }
  interface PhoneExtension {
    stores?: Subscribable[]; screens?: Record<string, (api: PhoneApi) => Fragment>; init?(api: PhoneApi): void;
    /** return true when handled; the tile's `act` in the manifest arrives here */ onClick?(act: string, el: HTMLElement, api: PhoneApi): boolean; onStore?(evt: any, api: PhoneApi): void;
  }

  // ---------- the module registry ----------
  interface Registry { readonly SDK_VERSION: string; define(m: Manifest): boolean; api<T = any>(id: string): T | null; check(opts?: { runtime?: boolean }): { errors: string[]; warnings: string[]; modules: string[] }; [k: string]: any }
  interface Platform { sdk: Sdk; modules: Registry; [module: string]: any }
}

declare const BS: BuiltSync.Platform;
interface Window { BS: BuiltSync.Platform }
