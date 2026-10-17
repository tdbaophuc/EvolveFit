"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ClipboardList,
  Dumbbell,
  FileSearch,
  LayoutDashboard,
  Shield,
  SlidersHorizontal,
  Users
} from "lucide-react";
import type { ExerciseDefinition, MovementPattern, RoutineTemplate } from "@evolvefit/shared";
import {
  evolveFitApiClient,
  type AdminActor,
  type AdminAuditLog,
  type AdminDashboardSummary,
  type AdminPermission,
  type AdminRole,
  type AdminRoleAssignment,
  type AdminUserLookup
} from "@/lib/api-client";
import styles from "./admin.module.css";

type AdminTab = "overview" | "exercises" | "templates" | "support" | "roles" | "audit" | "governance";
type LoadState = "loading" | "ready" | "forbidden" | "error";

const tabs: { id: AdminTab; label: string; permission: AdminPermission; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "overview", label: "Overview", permission: "admin:dashboard", icon: LayoutDashboard },
  { id: "exercises", label: "Exercises", permission: "content:read", icon: Dumbbell },
  { id: "templates", label: "Templates", permission: "content:read", icon: ClipboardList },
  { id: "support", label: "Support", permission: "support:read", icon: Users },
  { id: "roles", label: "Roles", permission: "roles:write", icon: Shield },
  { id: "audit", label: "Audit", permission: "audit:read", icon: FileSearch },
  { id: "governance", label: "Governance", permission: "admin:dashboard", icon: Activity }
];

const statusOptions = ["all", "draft", "published", "archived", "pending-review"];

export default function AdminPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [actor, setActor] = useState<AdminActor | null>(null);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [error, setError] = useState("");
  const [loginEmail, setLoginEmail] = useState("admin@example.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [exerciseStatus, setExerciseStatus] = useState("all");
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
  const [exerciseTotal, setExerciseTotal] = useState(0);
  const [exerciseDraft, setExerciseDraft] = useState<Partial<ExerciseDefinition>>({
    name: "",
    muscleGroup: "Chest",
    equipment: "dumbbell",
    movementPattern: "push",
    status: "draft",
    license: "EvolveFit original"
  });
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateStatus, setTemplateStatus] = useState("all");
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [templateTotal, setTemplateTotal] = useState(0);
  const [templateDraft, setTemplateDraft] = useState<Partial<RoutineTemplate>>({
    name: "",
    summary: "",
    targetGoal: "muscle",
    daysPerWeek: 3,
    minutesPerSession: 60,
    status: "draft",
    license: "EvolveFit original"
  });
  const [supportQuery, setSupportQuery] = useState("");
  const [users, setUsers] = useState<AdminUserLookup[]>([]);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [roles, setRoles] = useState<AdminRoleAssignment[]>([]);
  const [roleEmail, setRoleEmail] = useState("");
  const [roleValue, setRoleValue] = useState<AdminRole>("support");
  const [auditResource, setAuditResource] = useState("");
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [governance, setGovernance] = useState<{ mode: string; bootstrapConfigured: boolean; checkedAt: string } | null>(null);

  const permissions = useMemo(() => new Set(actor?.permissions ?? []), [actor]);
  const visibleTabs = tabs.filter((tab) => permissions.has(tab.permission));
  const canWriteContent = permissions.has("content:write");

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (loadState !== "ready") return;
    if (activeTab === "exercises") void loadExercises();
    if (activeTab === "templates") void loadTemplates();
    if (activeTab === "support") void loadSupport();
    if (activeTab === "roles") void loadRoles();
    if (activeTab === "audit") void loadAuditLogs();
    if (activeTab === "governance") void loadGovernance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loadState]);

  async function bootstrap() {
    setLoadState("loading");
    const result = await evolveFitApiClient.adminDashboard();
    if (!result.ok) {
      setLoadState(result.error === "Forbidden" ? "forbidden" : "error");
      setError(result.error);
      return;
    }
    setActor(result.data.actor);
    setSummary(result.data.summary);
    setLoadState("ready");
  }

  async function login() {
    setError("");
    const result = await evolveFitApiClient.signIn({ email: loginEmail, password: loginPassword || undefined, mode: "local" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await bootstrap();
  }

  async function loadExercises() {
    const result = await evolveFitApiClient.adminExercises({ query: exerciseQuery, status: exerciseStatus, pageSize: 25 });
    if (result.ok) {
      setExercises(result.data.items);
      setExerciseTotal(result.data.total);
    } else setError(result.error);
  }

  async function createExercise() {
    if (!exerciseDraft.name?.trim()) {
      setError("Tên bài tập là bắt buộc.");
      return;
    }
    const result = await evolveFitApiClient.adminCreateExercise(exerciseDraft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setExerciseDraft({ ...exerciseDraft, name: "" });
    await loadExercises();
    await refreshSummary();
  }

  async function updateExercise(id: string, patch: Partial<ExerciseDefinition>) {
    const result = await evolveFitApiClient.adminUpdateExercise(id, patch);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await loadExercises();
    await refreshSummary();
  }

  async function loadTemplates() {
    const result = await evolveFitApiClient.adminRoutineTemplates({ query: templateQuery, status: templateStatus, pageSize: 25 });
    if (result.ok) {
      setTemplates(result.data.items);
      setTemplateTotal(result.data.total);
    } else setError(result.error);
  }

  async function createTemplate() {
    if (!templateDraft.name?.trim()) {
      setError("Tên template là bắt buộc.");
      return;
    }
    const result = await evolveFitApiClient.adminCreateRoutineTemplate(templateDraft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTemplateDraft({ ...templateDraft, name: "", summary: "" });
    await loadTemplates();
    await refreshSummary();
  }

  async function updateTemplate(id: string, patch: Partial<RoutineTemplate>) {
    const result = await evolveFitApiClient.adminUpdateRoutineTemplate(id, patch);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await loadTemplates();
    await refreshSummary();
  }

  async function loadSupport() {
    const [userResult, feedbackResult] = await Promise.all([evolveFitApiClient.adminUsers(supportQuery), evolveFitApiClient.adminFeedback()]);
    if (userResult.ok) setUsers(userResult.data.items);
    if (feedbackResult.ok) setFeedbackCount(feedbackResult.data.total);
  }

  async function loadRoles() {
    const result = await evolveFitApiClient.adminRoles();
    if (result.ok) setRoles(result.data.items);
  }

  async function writeRole(revoke = false) {
    if (!roleEmail.trim()) {
      setError("Email admin là bắt buộc.");
      return;
    }
    const result = await evolveFitApiClient.adminWriteRole({ email: roleEmail, role: roleValue, revoke });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await loadRoles();
  }

  async function loadAuditLogs() {
    const result = await evolveFitApiClient.adminAuditLogs({ resourceType: auditResource || undefined, pageSize: 25 });
    if (result.ok) {
      setAuditLogs(result.data.items);
      setAuditTotal(result.data.total);
    }
  }

  async function loadGovernance() {
    const result = await evolveFitApiClient.adminGovernanceHealth();
    if (result.ok) setGovernance(result.data);
  }

  async function refreshSummary() {
    const result = await evolveFitApiClient.adminDashboard();
    if (result.ok) setSummary(result.data.summary);
  }

  if (loadState === "loading") {
    return <StateCard title="Đang tải admin" body="Đang kiểm tra quyền truy cập và phiên đăng nhập." />;
  }

  if (loadState !== "ready") {
    return (
      <main className={styles.state}>
        <section className={styles.stateCard}>
          <Shield size={26} />
          <h1>Admin access</h1>
          <p className={styles.muted}>Đăng nhập bằng tài khoản có role admin để tiếp tục. Nếu thấy 401/403, hãy kiểm tra `ADMIN_BOOTSTRAP_EMAILS` hoặc role assignment.</p>
          {error && <div className={styles.error}>{error}</div>}
          <label className={styles.field}>
            <span>Email</span>
            <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Password</span>
            <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} />
          </label>
          <button className={styles.primaryButton} onClick={login}>Đăng nhập admin</button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <strong>EvolveFit Admin</strong>
          <span>{actor?.email}</span>
        </div>
        <nav className={styles.nav} aria-label="Admin navigation">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={activeTab === tab.id ? styles.active : ""} onClick={() => setActiveTab(tab.id)}>
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </nav>
        <div className={styles.roleRow}>
          {actor?.roles.map((role) => <span key={role} className={styles.pill}>{role}</span>)}
        </div>
      </aside>
      <section className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label ?? "Admin"}</h1>
            <p className={styles.muted}>Quản trị production qua API admin server-side, không hiển thị secrets trong frontend.</p>
          </div>
          <button className={styles.secondaryButton} onClick={() => void bootstrap()}>Refresh</button>
        </header>
        {error && <div className={styles.error}>{error}</div>}
        {activeTab === "overview" && <Overview summary={summary} />}
        {activeTab === "exercises" && (
          <ContentExercises
            items={exercises}
            total={exerciseTotal}
            query={exerciseQuery}
            status={exerciseStatus}
            draft={exerciseDraft}
            canWrite={canWriteContent}
            setQuery={setExerciseQuery}
            setStatus={setExerciseStatus}
            setDraft={setExerciseDraft}
            reload={loadExercises}
            create={createExercise}
            update={updateExercise}
          />
        )}
        {activeTab === "templates" && (
          <RoutineTemplatesView
            items={templates}
            total={templateTotal}
            query={templateQuery}
            status={templateStatus}
            draft={templateDraft}
            canWrite={canWriteContent}
            setQuery={setTemplateQuery}
            setStatus={setTemplateStatus}
            setDraft={setTemplateDraft}
            reload={loadTemplates}
            create={createTemplate}
            update={updateTemplate}
          />
        )}
        {activeTab === "support" && <SupportView query={supportQuery} users={users} feedbackCount={feedbackCount} setQuery={setSupportQuery} reload={loadSupport} />}
        {activeTab === "roles" && (
          <RolesView roles={roles} email={roleEmail} role={roleValue} setEmail={setRoleEmail} setRole={setRoleValue} writeRole={writeRole} />
        )}
        {activeTab === "audit" && <AuditView logs={auditLogs} total={auditTotal} resource={auditResource} setResource={setAuditResource} reload={loadAuditLogs} />}
        {activeTab === "governance" && <GovernanceView governance={governance} />}
      </section>
    </main>
  );
}

function StateCard(props: { title: string; body: string }) {
  return (
    <main className={styles.state}>
      <section className={styles.stateCard}>
        <SlidersHorizontal size={26} />
        <h1>{props.title}</h1>
        <p className={styles.muted}>{props.body}</p>
      </section>
    </main>
  );
}

function Overview({ summary }: { summary: AdminDashboardSummary | null }) {
  const metrics = [
    ["Marketplace exercises", summary?.marketplaceExercises ?? 0],
    ["Published exercises", summary?.publishedExercises ?? 0],
    ["Routine templates", summary?.routineTemplates ?? 0],
    ["Published templates", summary?.publishedRoutineTemplates ?? 0],
    ["Pending reports", summary?.pendingReports ?? 0],
    ["Sync events", summary?.syncEventsVisibleToAdmin ?? 0],
    ["Audit logs", summary?.auditLogs ?? 0]
  ];
  return (
    <section className={styles.grid}>
      {metrics.map(([label, value]) => (
        <div key={label} className={styles.metric}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}

function ContentExercises(props: {
  items: ExerciseDefinition[];
  total: number;
  query: string;
  status: string;
  draft: Partial<ExerciseDefinition>;
  canWrite: boolean;
  setQuery: (value: string) => void;
  setStatus: (value: string) => void;
  setDraft: (value: Partial<ExerciseDefinition>) => void;
  reload: () => void;
  create: () => void;
  update: (id: string, patch: Partial<ExerciseDefinition>) => void;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <>
      <Toolbar title="Marketplace exercises" total={props.total} query={props.query} status={props.status} setQuery={props.setQuery} setStatus={props.setStatus} reload={props.reload} />
      {props.canWrite && (
        <>
          <button className={styles.primaryButton} onClick={() => setShowCreateForm(!showCreateForm)} aria-expanded={showCreateForm}>
            {showCreateForm ? "Hide draft form" : "Create draft exercise"}
          </button>
          {showCreateForm && (
            <section className={styles.card}>
              <h2>Create exercise</h2>
              <div className={styles.formGrid}>
                <Field label="Name" value={props.draft.name ?? ""} onChange={(name) => props.setDraft({ ...props.draft, name })} />
                <Field label="Muscle group" value={props.draft.muscleGroup ?? ""} onChange={(muscleGroup) => props.setDraft({ ...props.draft, muscleGroup })} />
                <SelectField label="Equipment" value={props.draft.equipment ?? "dumbbell"} options={["barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "other"]} onChange={(equipment) => props.setDraft({ ...props.draft, equipment: equipment as ExerciseDefinition["equipment"] })} />
                <SelectField label="Pattern" value={props.draft.movementPattern ?? "push"} options={["push", "pull", "squat", "hinge", "lunge", "carry", "isolation", "core"]} onChange={(movementPattern) => props.setDraft({ ...props.draft, movementPattern: movementPattern as MovementPattern })} />
                <SelectField label="Status" value={props.draft.status ?? "draft"} options={statusOptions.slice(1)} onChange={(status) => props.setDraft({ ...props.draft, status: status as ExerciseDefinition["status"] })} />
                <Field label="License" value={props.draft.license ?? ""} onChange={(license) => props.setDraft({ ...props.draft, license })} />
                <Field className={styles.wide} label="Cues" value={(props.draft.cues ?? []).join(", ")} onChange={(value) => props.setDraft({ ...props.draft, cues: splitList(value) })} />
                <Field label="Media URL" value={props.draft.mediaUrl ?? ""} onChange={(mediaUrl) => props.setDraft({ ...props.draft, mediaUrl })} />
              </div>
              <button className={styles.primaryButton} onClick={props.create}>Create exercise</button>
            </section>
          )}
        </>
      )}
      <section className={styles.card}>
        <Table headers={["Name", "Muscle", "Equipment", "Status", "License", "Actions"]}>
          {props.items.map((exercise) => (
            <tr key={exercise.id}>
              <td><strong>{exercise.name}</strong><br /><span className={styles.muted}>{exercise.slug}</span></td>
              <td>{exercise.muscleGroup}</td>
              <td>{exercise.equipment}</td>
              <td><span className={styles.pill}>{exercise.status}</span></td>
              <td>{exercise.license ?? "-"}</td>
              <td className={styles.actions}>
                <AdminConfirmButton className={styles.secondaryButton} disabled={!props.canWrite} label="Publish" confirmLabel="Confirm publish" onConfirm={() => props.update(exercise.id, { status: "published" })} />
                <AdminConfirmButton className={styles.dangerButton} disabled={!props.canWrite} label="Archive" confirmLabel="Confirm archive" onConfirm={() => props.update(exercise.id, { status: "archived" })} />
              </td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}

function RoutineTemplatesView(props: {
  items: RoutineTemplate[];
  total: number;
  query: string;
  status: string;
  draft: Partial<RoutineTemplate>;
  canWrite: boolean;
  setQuery: (value: string) => void;
  setStatus: (value: string) => void;
  setDraft: (value: Partial<RoutineTemplate>) => void;
  reload: () => void;
  create: () => void;
  update: (id: string, patch: Partial<RoutineTemplate>) => void;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <>
      <Toolbar title="Routine templates" total={props.total} query={props.query} status={props.status} setQuery={props.setQuery} setStatus={props.setStatus} reload={props.reload} />
      {props.canWrite && (
        <>
          <button className={styles.primaryButton} onClick={() => setShowCreateForm(!showCreateForm)} aria-expanded={showCreateForm}>
            {showCreateForm ? "Hide draft form" : "Create draft template"}
          </button>
          {showCreateForm && (
            <section className={styles.card}>
              <h2>Create routine template</h2>
              <div className={styles.formGrid}>
                <Field label="Name" value={props.draft.name ?? ""} onChange={(name) => props.setDraft({ ...props.draft, name })} />
                <SelectField label="Goal" value={props.draft.targetGoal ?? "muscle"} options={["strength", "muscle", "fat-loss", "health"]} onChange={(targetGoal) => props.setDraft({ ...props.draft, targetGoal: targetGoal as RoutineTemplate["targetGoal"] })} />
                <SelectField label="Status" value={props.draft.status ?? "draft"} options={["draft", "published", "archived"]} onChange={(status) => props.setDraft({ ...props.draft, status: status as RoutineTemplate["status"] })} />
                <Field label="Days/week" value={String(props.draft.daysPerWeek ?? 3)} onChange={(daysPerWeek) => props.setDraft({ ...props.draft, daysPerWeek: Number(daysPerWeek) || 3 })} />
                <Field label="Minutes/session" value={String(props.draft.minutesPerSession ?? 60)} onChange={(minutesPerSession) => props.setDraft({ ...props.draft, minutesPerSession: Number(minutesPerSession) || 60 })} />
                <Field label="License" value={props.draft.license ?? ""} onChange={(license) => props.setDraft({ ...props.draft, license })} />
                <label className={`${styles.field} ${styles.full}`}>
                  <span>Summary</span>
                  <textarea value={props.draft.summary ?? ""} onChange={(event) => props.setDraft({ ...props.draft, summary: event.target.value })} />
                </label>
              </div>
              <button className={styles.primaryButton} onClick={props.create}>Create template</button>
            </section>
          )}
        </>
      )}
      <section className={styles.card}>
        <Table headers={["Name", "Goal", "Days", "Status", "Exercises", "Actions"]}>
          {props.items.map((template) => (
            <tr key={template.id}>
              <td><strong>{template.name}</strong><br /><span className={styles.muted}>{template.slug}</span></td>
              <td>{template.targetGoal}</td>
              <td>{template.daysPerWeek}</td>
              <td><span className={styles.pill}>{template.status}</span></td>
              <td>{template.days.reduce((sum, day) => sum + day.exercises.length, 0)}</td>
              <td className={styles.actions}>
                <AdminConfirmButton className={styles.secondaryButton} disabled={!props.canWrite} label="Publish" confirmLabel="Confirm publish" onConfirm={() => props.update(template.id, { status: "published" })} />
                <AdminConfirmButton className={styles.dangerButton} disabled={!props.canWrite} label="Archive" confirmLabel="Confirm archive" onConfirm={() => props.update(template.id, { status: "archived" })} />
              </td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}

function SupportView(props: { query: string; users: AdminUserLookup[]; feedbackCount: number; setQuery: (value: string) => void; reload: () => void }) {
  return (
    <section className={styles.card}>
      <div className={styles.toolbar}>
        <div><h2>Support operations</h2><p className={styles.muted}>Lookup is redacted by design. Open reports: {props.feedbackCount}</p></div>
        <div className={styles.filters}>
          <label className={styles.compactField}>
            <span>Search user</span>
            <input value={props.query} onChange={(event) => props.setQuery(event.target.value)} />
          </label>
          <button className={styles.secondaryButton} onClick={props.reload}>Search</button>
        </div>
      </div>
      <Table headers={["User id", "Email", "Mode"]}>
        {props.users.map((user) => <tr key={user.id}><td>{user.id}</td><td>{user.email}</td><td>{user.mode}</td></tr>)}
      </Table>
    </section>
  );
}

function RolesView(props: { roles: AdminRoleAssignment[]; email: string; role: AdminRole; setEmail: (value: string) => void; setRole: (value: AdminRole) => void; writeRole: (revoke?: boolean) => void }) {
  const [showRoleForm, setShowRoleForm] = useState(false);

  return (
    <section className={styles.card}>
      <h2>Role access</h2>
      <p className={styles.muted}>
        Super-admin controls all admin functions. Content-admin can govern marketplace content. Support can use redacted user lookup only.
      </p>
      <button className={styles.primaryButton} onClick={() => setShowRoleForm(!showRoleForm)} aria-expanded={showRoleForm}>
        {showRoleForm ? "Hide role change" : "Grant/revoke role"}
      </button>
      {showRoleForm && (
        <div className={styles.formGrid}>
          <Field label="Email" value={props.email} onChange={props.setEmail} />
          <SelectField label="Role" value={props.role} options={["super-admin", "content-admin", "support"]} onChange={(role) => props.setRole(role as AdminRole)} />
          <div className={styles.actions}>
            <AdminConfirmButton className={styles.primaryButton} label="Grant" confirmLabel="Confirm grant" onConfirm={() => props.writeRole(false)} />
            <AdminConfirmButton className={styles.dangerButton} label="Revoke" confirmLabel="Confirm revoke" onConfirm={() => props.writeRole(true)} />
          </div>
        </div>
      )}
      <Table headers={["Email", "Role", "Granted by", "Granted at"]}>
        {props.roles.map((role) => <tr key={`${role.email}-${role.role}`}><td>{role.email}</td><td>{role.role}</td><td>{role.grantedBy}</td><td>{role.grantedAt}</td></tr>)}
      </Table>
    </section>
  );
}

function AuditView(props: { logs: AdminAuditLog[]; total: number; resource: string; setResource: (value: string) => void; reload: () => void }) {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const selectedLog = props.logs.find((log) => log.id === selectedLogId) ?? null;

  return (
    <section className={styles.card}>
      <div className={styles.toolbar}>
        <div><h2>Audit logs</h2><p className={styles.muted}>{props.total} events</p></div>
        <div className={styles.filters}>
          <label className={styles.compactField}>
            <span>Resource type</span>
            <input value={props.resource} onChange={(event) => props.setResource(event.target.value)} />
          </label>
          <button className={styles.secondaryButton} onClick={props.reload}>Filter</button>
        </div>
      </div>
      <Table headers={["Action", "Resource", "Actor", "Created", "Details"]}>
        {props.logs.map((log) => (
          <tr key={log.id}>
            <td>{log.action}</td>
            <td>{log.resourceType}</td>
            <td>{log.actorEmail}</td>
            <td>{log.createdAt}</td>
            <td>
              <button className={styles.secondaryButton} onClick={() => setSelectedLogId(selectedLogId === log.id ? null : log.id)}>
                {selectedLogId === log.id ? "Hide" : "Details"}
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {selectedLog && (
        <div className={styles.detailPanel}>
          <div><span>Request</span><strong>{selectedLog.requestId}</strong></div>
          <div><span>Resource id</span><strong>{selectedLog.resourceId}</strong></div>
          <div><span>Created</span><strong>{selectedLog.createdAt}</strong></div>
        </div>
      )}
    </section>
  );
}

function GovernanceView({ governance }: { governance: { mode: string; bootstrapConfigured: boolean; checkedAt: string } | null }) {
  const [showRunbook, setShowRunbook] = useState(false);

  return (
    <section className={styles.card}>
      <h2>Governance health</h2>
      <div className={styles.grid}>
        <div className={styles.metric}><span>Repository mode</span><strong>{governance?.mode ?? "-"}</strong></div>
        <div className={styles.metric}><span>Bootstrap env</span><strong>{governance?.bootstrapConfigured ? "set" : "missing"}</strong></div>
        <div className={styles.metric}><span>Checked at</span><strong>{governance?.checkedAt ? new Date(governance.checkedAt).toLocaleTimeString("vi-VN") : "-"}</strong></div>
      </div>
      <button className={styles.secondaryButton} onClick={() => setShowRunbook(!showRunbook)} aria-expanded={showRunbook}>
        {showRunbook ? "Hide runbook details" : "View runbook details"}
      </button>
      {showRunbook && (
        <div className={styles.detailPanel}>
          <div><span>Runbook</span><strong>docs/admin-governance-runbook.md</strong></div>
          <div><span>Use for</span><strong>bootstrap, revoke, incident response</strong></div>
          <div><span>Policy</span><strong>no secrets or service-role keys in frontend</strong></div>
        </div>
      )}
    </section>
  );
}

function Toolbar(props: { title: string; total: number; query: string; status: string; setQuery: (value: string) => void; setStatus: (value: string) => void; reload: () => void }) {
  return (
    <section className={styles.card}>
      <div className={styles.toolbar}>
        <div><h2>{props.title}</h2><p className={styles.muted}>{props.total} records</p></div>
        <div className={styles.filters}>
          <label className={styles.compactField}>
            <span>Search</span>
            <input value={props.query} onChange={(event) => props.setQuery(event.target.value)} />
          </label>
          <label className={styles.compactField}>
            <span>Status</span>
            <select value={props.status} onChange={(event) => props.setStatus(event.target.value)}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select>
          </label>
          <button className={styles.secondaryButton} onClick={props.reload}>Apply</button>
        </div>
      </div>
    </section>
  );
}

function Table(props: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr>{props.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{props.children}</tbody>
      </table>
    </div>
  );
}

function Field(props: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`${styles.field} ${props.className ?? ""}`}>
      <span>{props.label}</span>
      <input value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </label>
  );
}

function SelectField(props: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className={styles.field}>
      <span>{props.label}</span>
      <select value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        {props.options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function AdminConfirmButton(props: {
  className: string;
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timeout = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [armed]);

  return (
    <button
      className={props.className}
      disabled={props.disabled}
      aria-pressed={armed}
      onClick={() => {
        if (props.disabled) return;
        if (!armed) {
          setArmed(true);
          return;
        }
        props.onConfirm();
        setArmed(false);
      }}
    >
      {armed ? props.confirmLabel : props.label}
    </button>
  );
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
