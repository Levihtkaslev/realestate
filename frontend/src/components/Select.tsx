"use client";
// dropdown (Headless UI Listbox): value + onChange, or name + defaultValue inside a <form>

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  options: SelectOption[];
  value?: string;                       // way 1
  onChange?: (value: string) => void;   // way 1
  name?: string;                        // way 2 (form field name)
  defaultValue?: string;                // way 2 (starting value)
  disabled?: boolean;
  className?: string;
};

const Select = ({ options, value, onChange, name, defaultValue, disabled = false, className = "" }: SelectProps) => {
  return (
    <Listbox value={value} onChange={onChange} name={name} defaultValue={defaultValue} disabled={disabled}>

      {/* ---------- the button you click (shows the chosen label) ---------- */}
      <ListboxButton
        className={
          "flex min-w-40 items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-700 " +
          "hover:border-gray-400 focus:outline-none data-focus:border-primary data-open:border-primary " +
          "data-disabled:cursor-not-allowed data-disabled:bg-gray-100 data-disabled:text-gray-400 " +
          className
        }
      >
        {(button) => {
          // find the label of the chosen value (first option if nothing matches)
          let label = "";
          if (options.length > 0) {
            label = options[0].label;
          }
          for (const option of options) {
            if (option.value === button.value) {
              label = option.label;
            }
          }
          return (
            <>
              <span className="truncate">{label}</span>
              <FiChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
            </>
          );
        }}
      </ListboxButton>

      {/* ---------- the list that opens below (at least as wide as the button, wider if text is long) ---------- */}
      <ListboxOptions
        anchor="bottom end"
        modal={false}
        transition
        className="z-50 mt-1 max-h-64 w-max min-w-(--button-width) overflow-auto rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-lg focus:outline-none transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0"
      >
        {options.map((option) => (
          <ListboxOption
            key={option.value}
            value={option.value}
            className="group flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-gray-700 data-focus:bg-primary-light data-focus:text-primary data-selected:font-semibold"
          >
            <span className="truncate">{option.label}</span>
            {/* tick mark only on the chosen option */}
            <FiCheck className="invisible h-4 w-4 text-primary group-data-selected:visible" />
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
};

export default Select;
