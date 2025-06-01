import { useCallback, useEffect, useState } from "react";

export const fetchAPI = async (url: string, options?: RequestInit) => {
    try {
        const response = await fetch(url, options);
        // console.log("response :", response);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        if (!text) {
            return null;
        }
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("JSON Parse error:", e);
            console.error("Response text:", text);
            throw new Error(`Invalid JSON response: ${text}`);
        }
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await fetchAPI(url, options);
            setData(result.data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [url, options]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {data, loading, error, refetch: fetchData};
};