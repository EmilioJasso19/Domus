import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { BLUE } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface InputFieldProps extends TextInputProps {
  label: string;
  labelSuffix?: string;
  icon?: IoniconsName;
  error?: string;
  rightIcon?: IoniconsName;
  onRightIconPress?: () => void;
}

export default function InputField({
  label,
  labelSuffix,
  icon,
  error,
  rightIcon,
  onRightIconPress,
  ...textInputProps
}: InputFieldProps) {
  const [isFocused, setFocused] = useState(false);

  return (
    <View className="mb-4">
      <View className="flex-row items-baseline mb-1.5">
        <Text className="text-md font-nunito-semibold text-gray-700">{label}</Text>
        {labelSuffix && (
          <Text className="text-md font-nunito text-blue-600 ml-1.5">{labelSuffix}</Text>
        )}
      </View>

      <View
        className={`flex-row items-center border-[1.5px] rounded-xl h-[52px] px-3.5
          ${error
            ? 'border-red-300 bg-red-50'
            : isFocused
              ? 'bg-blue-50'
              : 'border-gray-200 bg-gray-50'
          }`}
        style={!error && isFocused ? { borderColor: BLUE } : undefined}
      >
        {icon && (
          <Ionicons name={icon} size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        )}

        <TextInput
          className="flex-1 text-[15px] text-gray-900 h-full"
          placeholderTextColor="#9CA3AF"
          {...textInputProps}
          onFocus={(e) => {
            setFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            textInputProps.onBlur?.(e);
          }}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={rightIcon} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text className="text-sm font-nunito text-red-900 mt-1 ml-0.5">{error}</Text>
      )}
    </View>
  );
}