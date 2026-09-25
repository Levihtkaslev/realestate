"use client";
// choose-one tabs (Headless UI RadioGroup): equal width, optional icon, big = large + full width

import { Radio, RadioGroup } from "@headlessui/react";

export type TabOption = {
  value: string;
  label: string;
  icon?: React.ReactNode; // e.g. <RiHome4Fill />
};

type TabsProps = {
  options: TabOption[];
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  defaultValue?: string;
  big?: boolean;
};

const Tabs = ({ options, value, onChange, name, defaultValue, big = false }: TabsProps) => {

  // every tab gets the same width (grid with equal columns)
  let groupClass = "inline-grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-gray-100 p-1";
  let tabClass = "px-5 py-1.5 text-sm";
  let iconClass = "[&_svg]:h-4 [&_svg]:w-4";
  if (big) {
    groupClass = "grid w-full auto-cols-fr grid-flow-col gap-1 rounded-xl bg-gray-100 p-1.5";
    tabClass = "px-6 py-3 text-base";
    iconClass = "[&_svg]:h-5 [&_svg]:w-5";
  }

  return (
    <RadioGroup value={value} onChange={onChange} name={name} defaultValue={defaultValue} className={groupClass}>
      {options.map((option) => {
        return (
          <Radio
            key={option.value}
            value={option.value}
            className={"flex items-center justify-center gap-2 rounded-md font-medium text-gray-600 transition-colors focus:outline-none data-hover:text-gray-900 data-checked:bg-primary data-checked:text-white data-checked:data-hover:bg-primary-dark data-checked:data-hover:text-white data-checked:shadow-sm data-focus:ring-2 data-focus:ring-primary/40 " + tabClass}
          >
            {option.icon && <span className={"flex " + iconClass}>{option.icon}</span>}
            {option.label}
          </Radio>
        );
      })}
    </RadioGroup>
  );
};

export default Tabs;
