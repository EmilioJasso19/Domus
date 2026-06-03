import { Tabs, useRouter } from "expo-router";
import React from "react";
import { View, Pressable, Platform } from "react-native";
import { Home, CheckSquare, Users, Settings, Plus } from "lucide-react-native";
import { HapticTab } from "@/components/haptic-tab";

const ACTIVE = "#2563EB";
const INACTIVE = "#9CA3AF";

export default function TabLayout() {
  const router = useRouter();

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: ACTIVE,
          tabBarInactiveTintColor: INACTIVE,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontFamily: "Nunito_600SemiBold",
            fontSize: 11,
          },
          tabBarStyle: {
            height: Platform.OS === "ios" ? 88 : 64,
            paddingTop: 6,
            paddingBottom: Platform.OS === "ios" ? 28 : 8,
            backgroundColor: "#fff",
            borderTopColor: "#F1F5F9",
          },
        }}
      >
        {/* index = setup-household: NO debe ser una tab visible.
            href: null lo oculta de la barra pero sigue siendo la ruta por
            defecto del grupo (a la que puedes redirigir si no hay casa). */}
        <Tabs.Screen name="index" options={{ href: null }} />

        {/* Inicio → home.tsx (tu dashboard real) */}
        <Tabs.Screen
          name="home"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />

        {/* Tareas → tasks.tsx */}
        <Tabs.Screen
          name="tasks"
          options={{
            title: "Tareas",
            tabBarIcon: ({ color }) => <CheckSquare size={24} color={color} />,
          }}
        />

        {/* Espacio vacío en el centro para que el FAB flotante no tape un ícono.
            Es una "tab" oculta que solo reserva el hueco visual. */}
        {/* <Tabs.Screen
          name="__fab_spacer"
          options={{
            title: "",
            tabBarButton: () => <View className="flex-1" />,
          }}
        /> */}

        {/* Familia → family.tsx */}
        <Tabs.Screen
          name="family"
          options={{
            title: "Familia",
            tabBarIcon: ({ color }) => <Users size={24} color={color} />,
          }}
        />

        {/* Perfil → profile.tsx */}
        <Tabs.Screen
          name="profile"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
          }}
        />
      </Tabs>

      {/* ── FAB flotante: encima de la barra, sin ser una tab ── */}
      <Pressable
        onPress={() => router.push("/tasks/create")}
        className="absolute self-center w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow-lg shadow-blue-600/40 active:bg-blue-700"
        style={{
          bottom: Platform.OS === "ios" ? 46 : 40,
        }}
      >
        <Plus size={28} color="#fff" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}