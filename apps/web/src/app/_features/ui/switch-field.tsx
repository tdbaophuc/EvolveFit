import React from "react";

export function SwitchField(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  helpText?: string;
}) {
  return (
    <label className={`switch-field ${props.className ?? ""}`}>
      <span className="switch-copy">
        <span>{props.label}</span>
        {props.helpText && <em>{props.helpText}</em>}
      </span>
      <span className="switch-control">
        <input
          type="checkbox"
          role="switch"
          checked={props.checked}
          disabled={props.disabled}
          onChange={(event) => props.onChange(event.target.checked)}
        />
        <span aria-hidden="true" className="switch-track">
          <span className="switch-thumb" />
        </span>
      </span>
    </label>
  );
}
