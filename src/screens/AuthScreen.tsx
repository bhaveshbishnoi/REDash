import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { registerUser, loginUser } from '../services/authService';
import { setUser, setError } from '../store/authSlice';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const user = await loginUser(email, password);
        dispatch(setUser({
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || 'Guerrilla Rider',
        }));
      } else {
        const user = await registerUser(email, password, name);
        dispatch(setUser(user));
      }
    } catch (e: any) {
      Alert.alert('Authentication Failed', e.message || 'An error occurred');
      dispatch(setError(e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSkipAuth = () => {
    // Enable offline/sandbox mode instantly
    dispatch(setUser({
      uid: 'sandbox_user',
      email: 'sandbox@guerrilla.com',
      name: 'Sandbox Rider',
    }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🏍️ GUERRILLA 450</Text>
      <Text style={styles.subtitle}>Royal Enfield Companion</Text>

      <View style={styles.form}>
        {!isLogin && (
          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#888"
            style={styles.input}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          placeholder="Email Address"
          placeholderTextColor="#888"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#888"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />

        {loading ? (
          <ActivityIndicator size="large" color="#FF5722" style={styles.loader} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleAuth}>
            <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.switchButton} onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkipAuth}>
          <Text style={styles.skipText}>Run Offline Mode (Sandbox)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
    marginBottom: 40,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  form: {
    width: '100%',
    maxWidth: 320,
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  button: {
    backgroundColor: '#FF5722',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 16,
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#aaaaaa',
    fontSize: 13,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 10,
    borderRadius: 8,
  },
  skipText: {
    color: '#FF5722',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
