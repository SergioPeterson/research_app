import { View, Text, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Feed() {
  const [papers, setPapers] = useState<any[]>([]);

  useEffect(() => {
    const fetchPapers = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch("http://192.168.1.91:8000/papers/feed", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        setPapers(data.papers || []);
      } catch (error) {
        console.error("Failed to fetch papers", error);
      }
    };

    fetchPapers();
  }, []);

  return (
    <ScrollView style={{ flex: 1, padding: 20, marginTop: 40 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Today's Papers</Text>

      {papers.map(paper => (
        <View key={paper.paper_id} style={{ marginBottom: 20, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 10 }}>
          <Text style={{ fontSize: 18 }}>{paper.title}</Text>
          <Text numberOfLines={2} style={{ marginVertical: 10 }}>{paper.abstract}</Text>
        </View>
      ))}
    </ScrollView>
  );
}