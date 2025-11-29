
export interface Company {
    id: string;
    name: string;
    industry?: string | null;
    location?: string | null;
    company_website?: string | null;
    hr_name?: string | null;
    hr_phone?: string | null;
    hr_linkedin?: string | null;
    company_size?: string | null;
}

// Levenshtein distance algorithm
const levenshteinDistance = (a: string, b: string): number => {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

// Normalize string for comparison
const normalizeString = (str: string): string => {
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
};

// Extract acronym from parentheses (e.g., "Tata Consultancy Services (TCS)" -> "TCS")
const extractAcronymFromParentheses = (companyName: string): string | null => {
    const match = companyName.match(/\(([A-Z0-9]+)\)/);
    return match ? match[1] : null;
};

// Generate acronym from company name (e.g., "Tata Consultancy Services" -> "TCS")
const generateAcronym = (companyName: string): string => {
    // Remove content in parentheses first
    const nameWithoutParentheses = companyName.replace(/\([^)]*\)/g, '').trim();

    // Split by spaces and take first letter of each word
    const words = nameWithoutParentheses.split(/\s+/).filter(word => word.length > 0);

    // Only generate acronym if there are at least 2 words
    if (words.length < 2) return '';

    return words
        .map(word => word.charAt(0).toUpperCase())
        .join('');
};

export const findMatchingCompany = (
    inputName: string,
    companies: Company[],
    threshold: number = 0.8
): Company | null => {
    if (!inputName) return null;

    const normalizedInput = normalizeString(inputName);
    const inputUpper = inputName.trim().toUpperCase();

    // 1. Exact match (case-insensitive)
    const exactMatch = companies.find(
        (c) => c.name.toLowerCase() === inputName.toLowerCase()
    );
    if (exactMatch) return exactMatch;

    // 2. Normalized exact match
    const normalizedMatch = companies.find(
        (c) => normalizeString(c.name) === normalizedInput
    );
    if (normalizedMatch) return normalizedMatch;

    // 3. Acronym match (from parentheses)
    // Check if input matches acronym in parentheses like "(TCS)"
    if (inputName.trim().length >= 2) {
        for (const company of companies) {
            const extractedAcronym = extractAcronymFromParentheses(company.name);
            if (extractedAcronym && extractedAcronym.toUpperCase() === inputUpper) {
                return company;
            }
        }
    }

    // 4. Generated acronym match
    // Check if input matches generated acronym from company name
    if (inputName.trim().length >= 2) {
        for (const company of companies) {
            const generatedAcronym = generateAcronym(company.name);
            if (generatedAcronym && generatedAcronym.toUpperCase() === inputUpper) {
                return company;
            }
        }
    }

    // 5. Check if first word matches (common case: "Encora" vs "Encora Technologies")
    const inputWords = inputName.toLowerCase().trim().split(/\s+/);
    const firstInputWord = inputWords[0];

    for (const company of companies) {
        const companyWords = company.name.toLowerCase().trim().split(/\s+/);
        const firstCompanyWord = companyWords[0];

        // If first words match exactly (case-insensitive) and are significant length (>= 3 chars)
        if (firstInputWord === firstCompanyWord && firstInputWord.length >= 3) {
            return company;
        }

        // If normalized first words match
        const normalizedFirstInput = normalizeString(firstInputWord);
        const normalizedFirstCompany = normalizeString(firstCompanyWord);
        if (normalizedFirstInput === normalizedFirstCompany && normalizedFirstInput.length >= 3) {
            return company;
        }
    }

    // 6. Fuzzy match
    let bestMatch: Company | null = null;
    let bestScore = 0;

    for (const company of companies) {
        const normalizedCompany = normalizeString(company.name);
        const distance = levenshteinDistance(normalizedInput, normalizedCompany);
        const maxLength = Math.max(normalizedInput.length, normalizedCompany.length);
        const score = 1 - distance / maxLength;

        // Check for prefix matches (e.g., "encora" in "encoratechnologies")
        if (
            (normalizedCompany.startsWith(normalizedInput) || normalizedInput.startsWith(normalizedCompany)) &&
            Math.min(normalizedInput.length, normalizedCompany.length) >= 3
        ) {
            // Strong prefix match - return immediately
            return company;
        }

        // Check if one contains the other (substring match)
        if (company.name.toLowerCase().includes(inputName.toLowerCase()) || inputName.toLowerCase().includes(company.name.toLowerCase())) {
            // Calculate containment score
            const lengthDiff = Math.abs(normalizedInput.length - normalizedCompany.length);
            const containmentScore = 1 - (lengthDiff / (maxLength * 2));

            // If the shorter string is at least 50% of the longer string, consider it a match
            const minLength = Math.min(normalizedInput.length, normalizedCompany.length);
            const maxLen = Math.max(normalizedInput.length, normalizedCompany.length);
            if (minLength / maxLen >= 0.5 && minLength >= 3) {
                return company;
            }

            if (containmentScore > bestScore) {
                bestScore = containmentScore;
                bestMatch = company;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = company;
        }
    }

    return bestScore >= threshold ? bestMatch : null;
};
