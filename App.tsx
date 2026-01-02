
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    ScrollView,
    Linking,
    Alert,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Platform,
    Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

// Typy
interface Advertisement {
    id: string;
    imageUri: string;
    description: string;
    url: string;
    createdAt: number;
}

type Screen = 'Home' | 'Add' | 'Details';

// Nowoczesna paleta kolorów
const COLORS = {
    primary: '#6366F1',      // Indigo
    primaryDark: '#4F46E5',
    primaryLight: '#818CF8',
    secondary: '#EC4899',    // Pink
    success: '#10B981',      // Green
    danger: '#EF4444',       // Red
    warning: '#F59E0B',      // Amber
    background: '#F8FAFC',   // Slate 50
    surface: '#FFFFFF',
    surfaceHover: '#F1F5F9', // Slate 100
    text: '#0F172A',         // Slate 900
    textSecondary: '#64748B', // Slate 500
    textLight: '#94A3B8',    // Slate 400
    border: '#E2E8F0',       // Slate 200
    shadow: 'rgba(15, 23, 42, 0.08)'
};

// Komponent karty ogłoszenia z animacją
const AdCard = ({ item, onPress }: { item: Advertisement; onPress: () => void }) => {
    const scaleAnim = new Animated.Value(1);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={styles.adCard}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
            >
                <View style={styles.cardImageContainer}>
                    <Image
                        source={{ uri: item.imageUri }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                    <View style={styles.cardOverlay} />
                </View>
                <View style={styles.adInfo}>
                    <Text style={styles.adDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                    <View style={styles.urlContainer}>
                        <Text style={styles.urlIcon}>🔗</Text>
                        <Text style={styles.adUrl} numberOfLines={1}>
                            {item.url}
                        </Text>
                    </View>
                    <View style={styles.dateContainer}>
                        <Text style={styles.dateIcon}>📅</Text>
                        <Text style={styles.adDate}>
                            {new Date(item.createdAt).toLocaleDateString('pl-PL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// Główna aplikacja
export default function App() {
    const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
    const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
    const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAdvertisements();
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Brak uprawnień', 'Aplikacja potrzebuje dostępu do galerii');
            }
        }
    };

    const loadAdvertisements = async () => {
        try {
            const stored = await AsyncStorage.getItem('advertisements');
            if (stored) {
                setAdvertisements(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Błąd ładowania danych:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveAdvertisements = async (ads: Advertisement[]) => {
        try {
            await AsyncStorage.setItem('advertisements', JSON.stringify(ads));
            setAdvertisements(ads);
        } catch (error) {
            console.error('Błąd zapisywania danych:', error);
            Alert.alert('Błąd', 'Nie udało się zapisać ogłoszenia');
        }
    };

    const addAdvertisement = async (imageUri: string, description: string, url: string) => {
        const newAd: Advertisement = {
            id: Date.now().toString(),
            imageUri,
            description,
            url,
            createdAt: Date.now()
        };
        const updatedAds = [newAd, ...advertisements];
        await saveAdvertisements(updatedAds);
        setCurrentScreen('Home');
        Alert.alert('✅ Sukces', 'Ogłoszenie zostało dodane');
    };

    const deleteAdvertisement = async (id: string) => {
        Alert.alert(
            '🗑️ Potwierdź usunięcie',
            'Czy na pewno chcesz usunąć to ogłoszenie?',
            [
                { text: 'Anuluj', style: 'cancel' },
                {
                    text: 'Usuń',
                    style: 'destructive',
                    onPress: async () => {
                        const updatedAds = advertisements.filter(ad => ad.id !== id);
                        await saveAdvertisements(updatedAds);
                        setCurrentScreen('Home');
                        Alert.alert('✅ Usunięto', 'Ogłoszenie zostało usunięte');
                    }
                }
            ]
        );
    };

    const openDetails = (ad: Advertisement) => {
        setSelectedAd(ad);
        setCurrentScreen('Details');
    };

    // Ekran główny
    const HomeScreen = () => {
        const [searchQuery, setSearchQuery] = useState<string>('');

        const filteredAdvertisements = advertisements.filter(ad => {
            if (!searchQuery.trim()) return true;

            const query = searchQuery.toLowerCase();
            const description = ad.description.toLowerCase();
            const url = ad.url.toLowerCase();
            const date = new Date(ad.createdAt).toLocaleDateString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return description.includes(query) ||
                url.includes(query) ||
                date.includes(query);
        });

        const handleAddPress = () => {
            if (advertisements.length >= 5) {
                Alert.alert(
                    '⚠️ Limit osiągnięty',
                    'Możesz mieć maksymalnie 5 ogłoszeń. Usuń jedno z istniejących, aby dodać nowe.',
                    [{ text: 'OK', style: 'default' }]
                );
                return;
            }
            setCurrentScreen('Add');
        };

        return (
            <SafeAreaView style={styles.container}>
                {/* Gradient Header */}
                <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>CV Tracker</Text>
                            <Text style={styles.headerSubtitle}>Zarządzaj swoimi aplikacjami</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleAddPress}
                        >
                            <Text style={styles.addButtonIcon}>+</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Wyszukiwarka */}
                <View style={styles.searchWrapper}>
                    <View style={styles.searchContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Szukaj po opisie, linku lub dacie..."
                            placeholderTextColor={COLORS.textLight}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => setSearchQuery('')}
                            >
                                <Text style={styles.clearButtonText}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Ładowanie...</Text>
                    </View>
                ) : advertisements.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>Brak zapisanych ogłoszeń</Text>
                        <Text style={styles.emptySubtext}>
                            Kliknij przycisk "+" aby dodać pierwsze ogłoszenie
                        </Text>
                    </View>
                ) : filteredAdvertisements.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyText}>Brak wyników</Text>
                        <Text style={styles.emptySubtext}>
                            Nie znaleziono ogłoszeń dla "{searchQuery}"
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredAdvertisements}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContainer}
                        renderItem={({ item }) => (
                            <AdCard item={item} onPress={() => openDetails(item)} />
                        )}
                    />
                )}

                {/* Licznik z gradientem */}
                <View style={styles.counterContainer}>
                    <View style={styles.counterBadge}>
                        <Text style={styles.counterText}>
                            {advertisements.length} / 5
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    };

    // Ekran dodawania
    const AddScreen = () => {
        const [imageUri, setImageUri] = useState<string>('');
        const [description, setDescription] = useState<string>('');
        const [url, setUrl] = useState<string>('');
        const [isPickingImage, setIsPickingImage] = useState(false);

        const handlePickImage = async () => {
            setIsPickingImage(true);
            try {
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                });

                if (!result.canceled && result.assets && result.assets.length > 0) {
                    setImageUri(result.assets[0].uri);
                }
            } catch (error) {
                console.error('Błąd wyboru obrazu:', error);
                Alert.alert('Błąd', 'Nie udało się wybrać obrazu');
            } finally {
                setIsPickingImage(false);
            }
        };

        const handleSave = () => {
            if (!imageUri) {
                Alert.alert('⚠️ Błąd', 'Wybierz zdjęcie');
                return;
            }
            if (!description.trim()) {
                Alert.alert('⚠️ Błąd', 'Wpisz opis');
                return;
            }
            if (!url.trim()) {
                Alert.alert('⚠️ Błąd', 'Wpisz link');
                return;
            }
            addAdvertisement(imageUri, description.trim(), url.trim());
        };

        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => setCurrentScreen('Home')}
                        >
                            <Text style={styles.backButtonText}>← Wróć</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Nowe Ogłoszenie</Text>
                        <View style={{ width: 60 }} />
                    </View>
                </LinearGradient>

                <ScrollView style={styles.formContainer}>
                    <View style={styles.formSection}>
                        <Text style={styles.label}>
                            <Text style={styles.labelIcon}>📷</Text> Zdjęcie ogłoszenia
                        </Text>
                        <TouchableOpacity
                            style={[styles.imagePicker, imageUri && styles.imagePickerWithImage]}
                            onPress={handlePickImage}
                            disabled={isPickingImage}
                        >
                            {isPickingImage ? (
                                <ActivityIndicator size="large" color={COLORS.primary} />
                            ) : imageUri ? (
                                <>
                                    <Image
                                        source={{ uri: imageUri }}
                                        style={styles.selectedImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.changeImageOverlay}>
                                        <Text style={styles.changeImageText}>Zmień zdjęcie</Text>
                                    </View>
                                </>
                            ) : (
                                <View style={styles.imagePickerPlaceholder}>
                                    <View style={styles.imageIconCircle}>
                                        <Text style={styles.imagePickerIcon}>📷</Text>
                                    </View>
                                    <Text style={styles.imagePickerText}>Wybierz z galerii</Text>
                                    <Text style={styles.imagePickerSubtext}>Kliknij aby dodać zdjęcie</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>
                            <Text style={styles.labelIcon}>📝</Text> Opis stanowiska
                        </Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.textInput, styles.textInputMultiline]}
                                placeholder="Np. Senior React Developer w XYZ Corp"
                                placeholderTextColor={COLORS.textLight}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>
                            <Text style={styles.labelIcon}>🔗</Text> Link do ogłoszenia
                        </Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="https://example.com/job-offer"
                                placeholderTextColor={COLORS.textLight}
                                value={url}
                                onChangeText={setUrl}
                                keyboardType="url"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[COLORS.success, '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.saveButtonGradient}
                        >
                            <Text style={styles.saveButtonText}>✓ Zapisz Ogłoszenie</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    };

    // Ekran szczegółów
    const DetailsScreen = () => {
        if (!selectedAd) return null;

        const handleOpenLink = async () => {
            try {
                const supported = await Linking.canOpenURL(selectedAd.url);
                if (supported) {
                    await Linking.openURL(selectedAd.url);
                } else {
                    Alert.alert('Błąd', 'Nie można otworzyć linku');
                }
            } catch (error) {
                Alert.alert('Błąd', 'Wystąpił błąd przy otwieraniu linku');
            }
        };

        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => setCurrentScreen('Home')}
                        >
                            <Text style={styles.backButtonText}>← Wróć</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Szczegóły</Text>
                        <TouchableOpacity
                            style={styles.deleteButtonHeader}
                            onPress={() => deleteAdvertisement(selectedAd.id)}
                        >
                            <Text style={styles.deleteButtonIcon}>🗑️</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.detailsContainer}>
                    <View style={styles.detailsImageContainer}>
                        <Image
                            source={{ uri: selectedAd.imageUri }}
                            style={styles.detailsImage}
                            resizeMode="cover"
                        />
                    </View>

                    <View style={styles.detailsCard}>
                        <View style={styles.detailsSection}>
                            <View style={styles.detailsLabelContainer}>
                                <Text style={styles.detailsLabelIcon}>📝</Text>
                                <Text style={styles.detailsLabel}>Opis stanowiska</Text>
                            </View>
                            <Text style={styles.detailsDescription}>{selectedAd.description}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.detailsSection}>
                            <View style={styles.detailsLabelContainer}>
                                <Text style={styles.detailsLabelIcon}>🔗</Text>
                                <Text style={styles.detailsLabel}>Link do ogłoszenia</Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleOpenLink}
                                style={styles.linkButton}
                            >
                                <Text style={styles.detailsLink} numberOfLines={2}>
                                    {selectedAd.url}
                                </Text>
                                <Text style={styles.linkArrow}>→</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.detailsSection}>
                            <View style={styles.detailsLabelContainer}>
                                <Text style={styles.detailsLabelIcon}>📅</Text>
                                <Text style={styles.detailsLabel}>Data dodania</Text>
                            </View>
                            <Text style={styles.detailsDate}>
                                {new Date(selectedAd.createdAt).toLocaleString('pl-PL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteAdvertisement(selectedAd.id)}
                    >
                        <Text style={styles.deleteButtonText}>🗑️ Usuń ogłoszenie</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            {currentScreen === 'Home' && <HomeScreen />}
            {currentScreen === 'Add' && <AddScreen />}
            {currentScreen === 'Details' && <DetailsScreen />}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    headerGradient: {
        paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.surface,
        letterSpacing: 0.5
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2
    },
    addButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    addButtonIcon: {
        fontSize: 28,
        color: COLORS.surface,
        fontWeight: '300'
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 4
    },
    backButtonText: {
        color: COLORS.surface,
        fontSize: 16,
        fontWeight: '600'
    },
    deleteButtonHeader: {
        paddingVertical: 8,
        paddingHorizontal: 8
    },
    deleteButtonIcon: {
        fontSize: 22
    },
    searchWrapper: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3
    },
    searchIcon: {
        fontSize: 18,
        marginRight: 12
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        padding: 0
    },
    clearButton: {
        padding: 4,
        marginLeft: 8
    },
    clearButtonText: {
        fontSize: 20,
        color: COLORS.textSecondary,
        fontWeight: '400'
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
        opacity: 0.5
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center'
    },
    emptySubtext: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22
    },
    loadingText: {
        marginTop: 12,
        fontSize: 15,
        color: COLORS.textSecondary
    },
    listContainer: {
        padding: 16,
        paddingTop: 8
    },
    adCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    cardImageContainer: {
        position: 'relative',
        height: 180
    },
    thumbnail: {
        width: '100%',
        height: '100%'
    },
    cardOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        backgroundColor: 'linear-gradient(transparent, rgba(0,0,0,0.3))'
    },
    adInfo: {
        padding: 16
    },
    adDescription: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
        lineHeight: 24
    },
    urlContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: COLORS.background,
        padding: 8,
        borderRadius: 8
    },
    urlIcon: {
        fontSize: 14,
        marginRight: 6
    },
    adUrl: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '500',
        flex: 1
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    dateIcon: {
        fontSize: 14,
        marginRight: 6
    },
    adDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500'
    },
    formContainer: {
        flex: 1,
        padding: 20
    },
    formSection: {
        marginBottom: 28
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
        letterSpacing: 0.3
    },
    labelIcon: {
        fontSize: 18,
        marginRight: 6
    },
    imagePicker: {
        width: '100%',
        height: 220,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed'
    },
    imagePickerWithImage: {
        borderStyle: 'solid',
        borderWidth: 0
    },
    imagePickerPlaceholder: {
        alignItems: 'center'
    },
    imageIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    imagePickerIcon: {
        fontSize: 40
    },
    imagePickerText: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4
    },
    imagePickerSubtext: {
        fontSize: 14,
        color: COLORS.textSecondary
    },
    selectedImage: {
        width: '100%',
        height: '100%'
    },
    changeImageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 12,
        alignItems: 'center'
    },
    changeImageText: {
        color: COLORS.surface,
        fontSize: 14,
        fontWeight: '600'
    },
    inputContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2
    },
    textInput: {
        padding: 16,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500'
    },
    textInputMultiline: {
        minHeight: 100,
        textAlignVertical: 'top'
    },
    saveButton: {
        marginTop: 8,
        marginBottom: 40,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    saveButtonGradient: {
        padding: 18,
        alignItems: 'center'
    },
    saveButtonText: {
        color: COLORS.surface,
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    detailsContainer: {
        flex: 1
    },
    detailsImageContainer: {
        height: 300,
        backgroundColor: COLORS.text,
        overflow: 'hidden'
    },
    detailsImage: {
        width: '100%',
        height: '100%'
    },
    detailsCard: {
        backgroundColor: COLORS.surface,
        margin: 16,
        marginTop: -40,
        borderRadius: 24,
        padding: 20,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    detailsSection: {
        marginVertical: 8
    },
    detailsLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    detailsLabelIcon: {
        fontSize: 20,
        marginRight: 8
    },
    detailsLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    detailsDescription: {
        fontSize: 18,
        color: COLORS.text,
        lineHeight: 28,
        fontWeight: '500'
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    detailsLink: {
        flex: 1,
        fontSize: 15,
        color: COLORS.primary,
        fontWeight: '600'
    },
    linkArrow: {
        fontSize: 20,
        color: COLORS.primary,
        marginLeft: 8
    },
    detailsDate: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 12
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 16
    },
    deleteButton: {
        marginHorizontal: 16,
        marginVertical: 16,
        padding: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.danger
    },
    deleteButtonText: {
        color: COLORS.danger,
        fontSize: 16,
        fontWeight: '700'
    },
    counterContainer: {
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center'
    },
    counterBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3
    },
    counterText: {
        fontSize: 13,
        color: COLORS.surface,
        fontWeight: '700',
        letterSpacing: 0.5
    }
});