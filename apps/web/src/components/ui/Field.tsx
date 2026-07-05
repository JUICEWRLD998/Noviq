import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react"
import styles from "./Field.module.css"

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={[styles.input, className].filter(Boolean).join(" ")} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={[styles.input, styles.textarea, className].filter(Boolean).join(" ")}
      {...rest}
    />
  )
}

interface LabeledFieldProps {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}

export function LabeledField({ label, htmlFor, hint, children }: LabeledFieldProps) {
  return (
    <label className={styles.field} htmlFor={htmlFor}>
      <span className={styles.label}>{label}</span>
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  )
}
