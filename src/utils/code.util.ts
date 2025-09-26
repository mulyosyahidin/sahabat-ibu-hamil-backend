/**
 * Code Generation Utility
 * 
 * This utility provides functions for generating unique codes with specific formats.
 * Used for creating device codes and other identifiers.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * Generate a random string of uppercase letters
 * @param length - Number of letters to generate
 * @returns Random uppercase letters string
 */
function generateRandomLetters(length: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

/**
 * Generate a random string of numbers
 * @param length - Number of digits to generate
 * @returns Random numbers string
 */
function generateRandomNumbers(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

/**
 * Generate device code with format: YMD[4 LETTERS][3 NUMBERS]
 * Example: 251231ABCD678
 * 
 * @returns Generated device code
 */
export function generateDeviceCode(): string {
  const now = new Date();
  
  // Format: YMD (Year Month Day)
  const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero
  const day = now.getDate().toString().padStart(2, '0'); // Day with leading zero
  
  const datePrefix = year + month + day;
  
  // Generate 4 random letters
  const randomLetters = generateRandomLetters(4);
  
  // Generate 3 random numbers
  const randomNumbers = generateRandomNumbers(3);
  
  return datePrefix + randomLetters + randomNumbers;
}

/**
 * Validate device code format
 * @param code - Code to validate
 * @returns True if code matches the expected format
 */
export function isValidDeviceCodeFormat(code: string): boolean {
  // Format: YYMMDD + 4 letters + 3 numbers = 13 characters total
  const regex = /^\d{6}[A-Z]{4}\d{3}$/;
  return regex.test(code);
}