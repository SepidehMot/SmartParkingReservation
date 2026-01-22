function TextField({
  label,
  name,
  type = "text",
  value,
  required,
  disabled=false,
  errors,
  onChange,
  placeholder,
}) {
  return (
    <div>
      <label className="mb-2 block text-secondary-700" htmlFor={name}>
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        id={name}
        name={name}
        className="textField__input"
        type={type}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onChange={onChange}
        required={required}
        disabled={disabled}
      />
      {errors && (
        <span className="text-error block text-sm mt-2">{errors}</span>
      )}
    </div>
  );
}
export default TextField;
