import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "/api";

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { credentials: "include", ...options });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Request failed. Please try again.");
  return data;
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api(`/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow accent">Collab Docs Studio</p>
        <h1>{mode === "login" ? "Welcome back" : "Create your workspace"}</h1>
        <p className="muted">Write, import, and share rich-text documents with your team.</p>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>Full name<input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          )}
          <label>Email<input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input required minLength="8" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          {error && <p className="message error" role="alert">{error}</p>}
          <button className="primary-btn" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}</button>
        </form>
        <button className="text-btn" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>
      </section>
    </main>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [title, setTitle] = useState("");
  const [shareTarget, setShareTarget] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const editorRef = useRef(null);
  const fileRef = useRef(null);

  const activeDocument = useMemo(() => documents.find((doc) => doc.id === activeDocumentId) || null, [documents, activeDocumentId]);

  useEffect(() => {
    api("/auth/me").then((data) => setCurrentUser(data.user)).catch(() => {}).finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([api("/users"), api("/documents")])
      .then(([people, docs]) => { setUsers(people); setDocuments(docs); setActiveDocumentId((id) => docs.some((doc) => doc.id === id) ? id : docs[0]?.id || null); })
      .catch((err) => setStatus(err.message));
  }, [currentUser]);

  useEffect(() => {
    if (!activeDocument) { setTitle(""); if (editorRef.current) editorRef.current.innerHTML = ""; return; }
    setTitle(activeDocument.title);
    if (editorRef.current) editorRef.current.innerHTML = activeDocument.content || "<p></p>";
  }, [activeDocument]);

  async function refreshDocuments(preferredId = activeDocumentId) {
    const docs = await api("/documents");
    setDocuments(docs);
    setActiveDocumentId(docs.some((doc) => doc.id === preferredId) ? preferredId : docs[0]?.id || null);
  }

  async function runAction(action) {
    setLoading(true); setStatus("");
    try { await action(); } catch (err) { setStatus(err.message); } finally { setLoading(false); }
  }

  function createDocument() {
    runAction(async () => {
      const doc = await api("/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Untitled document", content: "<h2>Start writing…</h2>" }) });
      await refreshDocuments(doc.id); setStatus("Document created.");
    });
  }

  function saveDocument() {
    if (!activeDocument) return;
    runAction(async () => {
      await api(`/documents/${activeDocument.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, content: editorRef.current?.innerHTML || "<p></p>" }) });
      await refreshDocuments(activeDocument.id); setStatus("Saved.");
    });
  }

  function shareDocument() {
    if (!activeDocument || !shareTarget) return;
    runAction(async () => {
      await api(`/documents/${activeDocument.id}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: shareTarget }) });
      await refreshDocuments(activeDocument.id); setShareTarget(""); setStatus("Access granted.");
    });
  }

  function uploadAndImport() {
    if (!activeDocument || !uploadFile) return;
    runAction(async () => {
      const body = new FormData(); body.append("file", uploadFile);
      const data = await api(`/documents/${activeDocument.id}/upload`, { method: "POST", body });
      await refreshDocuments(activeDocument.id); setUploadFile(null); if (fileRef.current) fileRef.current.value = ""; setStatus(data.message);
    });
  }

  function applyFormat(command, value = null) {
    editorRef.current?.focus(); document.execCommand(command, false, value);
  }

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } finally { setCurrentUser(null); setDocuments([]); setActiveDocumentId(null); }
  }

  if (!authChecked) return <div className="center-page">Loading…</div>;
  if (!currentUser) return <AuthScreen onAuthenticated={setCurrentUser} />;

  return (
    <div className="app-shell">
      <aside className="side-panel">
        <div className="brand-box"><p className="eyebrow">Collab Docs Studio</p><h1>Your documents</h1></div>
        <div className="user-row"><div className="avatar">{currentUser.name.slice(0, 1).toUpperCase()}</div><div><strong>{currentUser.name}</strong><small>{currentUser.email}</small></div></div>
        <button className="primary-btn full" disabled={loading} onClick={createDocument}>+ New document</button>
        <div className="doc-list">
          {documents.map((doc) => (
            <button key={doc.id} className={`doc-card ${doc.id === activeDocumentId ? "active" : ""}`} onClick={() => { setActiveDocumentId(doc.id); setStatus(""); }}>
              <strong>{doc.title}</strong><small>{doc.isOwnedByCurrentUser ? "Owned by you" : `Shared by ${doc.owner.name}`}</small>
            </button>
          ))}
          {!documents.length && <p className="empty-note">No documents yet. Create your first draft.</p>}
        </div>
        <button className="logout-btn" onClick={logout}>Log out</button>
      </aside>

      <main className="editor-panel">
        {!activeDocument ? <section className="empty-state"><h2>Ready when you are</h2><p>Create a document to start writing.</p><button className="primary-btn" onClick={createDocument}>Create document</button></section> : <>
          <div className="toolbar" aria-label="Formatting toolbar">
            <button title="Bold" onClick={() => applyFormat("bold")}><strong>B</strong></button>
            <button title="Italic" onClick={() => applyFormat("italic")}><em>I</em></button>
            <button title="Underline" onClick={() => applyFormat("underline")}><u>U</u></button>
            <button onClick={() => applyFormat("formatBlock", "h2")}>Heading</button>
            <button onClick={() => applyFormat("formatBlock", "p")}>Body</button>
            <button onClick={() => applyFormat("insertUnorderedList")}>• List</button>
            <button onClick={() => applyFormat("insertOrderedList")}>1. List</button>
            <button className="primary-btn save-btn" disabled={loading} onClick={saveDocument}>{loading ? "Working…" : "Save"}</button>
          </div>
          <div className="meta-bar"><input maxLength="120" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" aria-label="Document title" /><span className={status && /failed|error|invalid|only|not|please/i.test(status) ? "error-text" : ""} role="status">{status || "All changes save when you click Save."}</span></div>
          <div ref={editorRef} className="editor-surface" contentEditable suppressContentEditableWarning aria-label="Document content" />
          <div className="action-grid">
            <section className="action-card"><h3>Share access</h3>{activeDocument.isOwnedByCurrentUser ? <><p>Invite a registered user to edit this document.</p><select value={shareTarget} onChange={(e) => setShareTarget(e.target.value)}><option value="">Choose a teammate</option>{users.filter((user) => !activeDocument.sharedWith.some((person) => person.id === user.id)).map((user) => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}</select><button disabled={!shareTarget || loading} onClick={shareDocument}>Grant access</button></> : <p>This document was shared with you by {activeDocument.owner.name}. You can edit and save it.</p>}<div className="people">{activeDocument.sharedWith.map((person) => <span key={person.id}>{person.name}</span>)}</div></section>
            <section className="action-card"><h3>Import a file</h3><p>Import `.txt` or `.md` text (maximum 1 MB). This replaces the current content.</p><input ref={fileRef} type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} /><button disabled={!uploadFile || loading} onClick={uploadAndImport}>Import into document</button>{activeDocument.attachments.length > 0 && <small>{activeDocument.attachments.length} import{activeDocument.attachments.length === 1 ? "" : "s"} recorded</small>}</section>
          </div>
        </>}
      </main>
    </div>
  );
}

export default App;
