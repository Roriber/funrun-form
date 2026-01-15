import React, { useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { format } from "date-fns";

const GAS_URL = import.meta.env.VITE_GAS_URL; // your Apps Script /exec URL
const FORM_SECRET = import.meta.env.VITE_FORM_SECRET || ""; // optional

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "OTHER"];

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("File read failed"));
        reader.onload = () => {
            const result = reader.result; // data:<mime>;base64,xxxx
            const base64 = String(result).split(",")[1];
            resolve(base64);
        };
        reader.readAsDataURL(file);
    });
}

export default function FunRunForm() {
    const [dateObj, setDateObj] = useState(null);
    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [address, setAddress] = useState("");
    const [shirtSize, setShirtSize] = useState("");
    const [otherSize, setOtherSize] = useState("");
    const [paymentFile, setPaymentFile] = useState(null);
    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    const [loading, setLoading] = useState(false);

    // ✅ file input ref (fix upload bug without refresh)
    const fileInputRef = useRef(null);

    // ✅ modal flow
    const [modalOpen, setModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState("message"); // "message" | "askAgain"
    const [modalType, setModalType] = useState("success"); // "success" | "error"
    const [modalText, setModalText] = useState("");

    const closeModal = () => {
        setModalOpen(false);
        setModalStep("message");
    };

    const notifyError = (text) => {
        setModalType("error");
        setModalText(text);
        setModalStep("message");
        setModalOpen(true);
    };

    const notifySubmitted = () => {
        setModalType("success");
        setModalText("Submitted! ✅");
        setModalStep("message");
        setModalOpen(true);
    };

    const resetForm = () => {
        setDateObj(null);
        setName("");
        setAge("");
        setAddress("");
        setShirtSize("");
        setOtherSize("");
        setPaymentFile(null);

        // ✅ IMPORTANT: clear real file input value (so you can upload again without refresh)
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const finalShirtSize = useMemo(() => {
        if (shirtSize !== "OTHER") return shirtSize;
        return otherSize.trim() ? `OTHER: ${otherSize.trim()}` : "OTHER";
    }, [shirtSize, otherSize]);

    async function handleSubmit(e) {
        e.preventDefault();
        closeModal(); // hide any old modal

        if (!GAS_URL) return notifyError("Missing VITE_GAS_URL in your .env file.");
        if (!dateObj) return notifyError("Please choose a date.");

        const date = format(dateObj, "MM/dd/yyyy");

        if (shirtSize === "OTHER" && !otherSize.trim()) {
            return notifyError("Please type your 'Other' shirt size.");
        }

        if (!paymentFile) return notifyError("Please upload your payment proof.");

        if (paymentFile.size > 5 * 1024 * 1024) {
            return notifyError("File too large. Please upload under 5MB.");
        }

        setLoading(true);
        try {
            const base64 = await fileToBase64(paymentFile);

            const payload = {
                secret: FORM_SECRET,
                date,
                name: name.trim(),
                age: String(age).trim(),
                address: address.trim(),
                shirtSize: finalShirtSize,
                payment: {
                    name: paymentFile.name,
                    mimeType: paymentFile.type || "application/octet-stream",
                    base64,
                },
            };

            await fetch(GAS_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload),
            });

            // ✅ show submitted popup, then ask if submit another
            notifySubmitted();
        } catch (err) {
            notifyError("Submit failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={styles.headerBar} />
                <div style={styles.header}>
                    <h2 style={styles.title}>Mapandan Eagles Club Fun Run</h2>
                    <p style={styles.subtitle}>
                        Please fill out the form. Fields marked * are required.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <Field label="Date" required helper="Format: MM/DD/YYYY">
                        <div style={styles.inputWrap}>
                            <DatePicker
                                selected={dateObj}
                                onChange={(d) => setDateObj(d)}
                                dateFormat="MM/dd/yyyy"
                                placeholderText="MM/DD/YYYY"
                                wrapperClassName="dpWrap"
                                className="dpInput"
                                showPopperArrow={false}
                                withPortal={isMobile}
                            />
                            <span style={{ color: "#5f6368" }}>📅</span>
                        </div>
                    </Field>

                    <Field label="Name" required>
                        <div style={styles.inputWrap}>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={styles.input}
                                placeholder="Short answer text"
                            />
                        </div>
                    </Field>

                    <Field label="Age" required>
                        <div style={styles.inputWrap}>
                            <input
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                style={styles.input}
                                placeholder="Short answer text"
                            />
                        </div>
                    </Field>

                    <Field label="Address" required>
                        <div style={styles.inputWrap}>
                            <input
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                style={styles.input}
                                placeholder="Short answer text"
                            />
                        </div>
                    </Field>

                    <Field label="T Shirt Sizes" required>
                        <div style={styles.radioGroup}>
                            {SIZES.map((s) => (
                                <label key={s} style={styles.radioRow}>
                                    <input
                                        type="radio"
                                        name="size"
                                        value={s}
                                        checked={shirtSize === s}
                                        onChange={() => setShirtSize(s)}
                                    />
                                    <span style={{ marginLeft: 8 }}>
                                        {s === "OTHER" ? "Other:" : s}
                                    </span>

                                    {s === "OTHER" && shirtSize === "OTHER" && (
                                        <input
                                            value={otherSize}
                                            onChange={(e) => setOtherSize(e.target.value)}
                                            style={{ ...styles.input, marginLeft: 12, flex: 1 }}
                                            placeholder="Type size"
                                        />
                                    )}
                                </label>
                            ))}
                        </div>
                    </Field>

                    <Field
                        label="Upload Payment"
                        required
                        helper="Upload a screenshot/photo/PDF of payment proof. (Max 5MB)"
                    >
                        <div style={styles.uploadBox}>
                            <div style={styles.uploadLeft}>
                                <div style={styles.uploadTitle}>Payment proof</div>
                                <div style={styles.uploadSub}>
                                    {paymentFile ? `Selected: ${paymentFile.name}` : "No file selected"}
                                </div>
                            </div>

                            <label style={styles.ghostBtn}>
                                Choose file
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,.pdf"
                                    // ✅ allows selecting same file again
                                    onClick={(e) => {
                                        e.target.value = null;
                                    }}
                                    onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                                    style={{ display: "none" }}
                                />
                            </label>
                        </div>
                    </Field>

                    <button type="submit" disabled={loading} style={styles.button}>
                        {loading ? "Submitting..." : "Submit"}
                    </button>
                </form>
            </div>

            {/* ✅ MODAL */}
            {modalOpen && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        {modalStep === "message" ? (
                            <>
                                {/* ✅ show only "Submitted!" for success */}
                                {modalType === "success" ? (
                                    <h3 style={{ margin: 0, fontSize: 20 }}>{modalText}</h3>
                                ) : (
                                    <>
                                        <h3 style={{ margin: 0, fontSize: 18 }}>Error ⚠️</h3>
                                        <p style={{ marginTop: 10, color: "#444" }}>{modalText}</p>
                                    </>
                                )}

                                <button
                                    onClick={() => {
                                        if (modalType === "success") {
                                            // ✅ after submitted, ask submit another
                                            setModalStep("askAgain");
                                        } else {
                                            closeModal();
                                        }
                                    }}
                                    style={{
                                        ...styles.button,
                                        marginTop: 14,
                                        width: "100%",
                                        background: modalType === "success" ? "#673ab7" : "#b00020",
                                    }}
                                >
                                    OK
                                </button>
                            </>
                        ) : (
                            <>
                                <h3 style={{ margin: 0, fontSize: 18 }}>Submit another one?</h3>
                                <p style={{ marginTop: 10, color: "#444" }}>
                                    Do you want to submit another registration?
                                </p>

                                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                                    <button
                                        onClick={() => {
                                            resetForm();   // ✅ clears form + file input (no refresh needed)
                                            closeModal();
                                        }}
                                        style={{ ...styles.button, flex: 1 }}
                                    >
                                        Yes
                                    </button>

                                    <button
                                        onClick={() => {
                                            resetForm();     // ✅ clear form + fix file input bug
                                            closeModal();    // ✅ close popup
                                        }}
                                        style={{
                                            ...styles.button,
                                            flex: 1,
                                            background: "#5f6368",
                                        }}
                                    >
                                        No
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, required, children, helper }) {
    return (
        <div style={styles.fieldCard}>
            <div style={styles.labelRow}>
                <div style={styles.label}>{label}</div>
                {required && <span style={styles.req}>*</span>}
            </div>

            {children}

            {helper && <div style={styles.helper}>{helper}</div>}
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        width: "100%",
        background: "#f3effb",
        padding: 28,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        color: "#202124",
    },

    card: {
        width: "100%",
        maxWidth: 760,
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(0,0,0,.10), 0 3px 12px rgba(0,0,0,.06)",
        overflow: "hidden",
        border: "1px solid #ececec",
    },

    headerBar: { height: 12, background: "#673ab7" },

    header: { padding: "18px 22px 10px 22px" },
    title: { margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.2 },
    subtitle: { margin: "6px 0 0 0", color: "#5f6368", fontSize: 13 },

    form: { padding: "8px 22px 22px 22px", display: "grid", gap: 14 },

    fieldCard: {
        border: "1px solid #e6e6e6",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
        transition: "box-shadow .15s ease, border-color .15s ease",
    },

    labelRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
    label: { fontSize: 14, fontWeight: 600 },
    req: { color: "#d93025", fontWeight: 700 },

    helper: { marginTop: 8, fontSize: 12, color: "#5f6368" },

    inputWrap: {
        border: "1px solid #dadce0",
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#fff",
    },

    input: {
        width: "100%",
        border: "none",
        outline: "none",
        fontSize: 14,
        background: "transparent",
    },

    radioGroup: { display: "grid", gap: 10, marginTop: 2 },
    radioRow: { display: "flex", alignItems: "center", gap: 10 },

    uploadBox: {
        border: "1px dashed #c7c7c7",
        borderRadius: 12,
        padding: 14,
        background: "#fafafa",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },

    uploadLeft: { display: "grid", gap: 4 },
    uploadTitle: { fontWeight: 600, fontSize: 13 },
    uploadSub: { fontSize: 12, color: "#5f6368" },

    button: {
        background: "#673ab7",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "10px 16px",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 700,
        boxShadow: "0 1px 2px rgba(0,0,0,.12)",
    },

    ghostBtn: {
        background: "#fff",
        color: "#673ab7",
        border: "1px solid #dadce0",
        borderRadius: 10,
        padding: "10px 14px",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 700,
    },

    modalOverlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
    },

    modal: {
        width: "100%",
        maxWidth: 420,
        background: "#fff",
        borderRadius: 14,
        padding: 20,
        boxShadow: "0 10px 30px rgba(0,0,0,.2)",
        border: "1px solid #eee",
    },
};
