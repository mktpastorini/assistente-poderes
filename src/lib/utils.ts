import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function replacePlaceholders(text: string, variables: Record<string, any>): string {
  if (!text) return '';
  let result = text;
  for (const key in variables) {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      const placeholder = `{${key}}`;
      // Acessa a propriedade 'ip' se a variável for um objeto, como o retorno da edge function
      const value = typeof variables[key] === 'object' && variables[key] !== null 
        ? variables[key].ip || JSON.stringify(variables[key]) 
        : variables[key];
        
      if (value !== null && value !== undefined) {
        result = result.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), String(value));
      }
    }
  }
  return result;
}