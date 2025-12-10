// App.tsx
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
    Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

// Typy
interface Advertisement {
    id: string;
    imageUri: string;
    description: string;
    url: string;
    createdAt: number;
}

type Screen = 'Home' | 'Add' | 'Details';

// Główna aplikacja
export default function App() {
    const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
    const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
    const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
    const [loading, setLoading] = useState(true);

    // Załaduj dane przy starcie
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
        Alert.alert('Sukces', 'Ogłoszenie zostało dodane');
    };

    const deleteAdvertisement = async (id: string) => {
        Alert.alert(
            'Potwierdź usunięcie',
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
                        Alert.alert('Usunięto', 'Ogłoszenie zostało usunięte');
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

        // Filtrowanie ogłoszeń na podstawie zapytania
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
                    'Limit osiągnięty',
                    'Możesz mieć maksymalnie 5 ogłoszeń. Usuń jedno z istniejących, aby dodać nowe.',
                    [{ text: 'OK', style: 'default' }]
                );
                return;
            }
            setCurrentScreen('Add');
        };

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Moje Ogłoszenia</Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAddPress}
                    >
                        <Text style={styles.addButtonText}>+ Dodaj</Text>
                    </TouchableOpacity>
                </View>

                {/* Wyszukiwarka */}
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Szukaj po opisie, linku lub dacie..."
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

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                    </View>
                ) : advertisements.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.emptyText}>Brak zapisanych ogłoszeń</Text>
                        <Text style={styles.emptySubtext}>Naciśnij "+ Dodaj" aby utworzyć nowe</Text>
                    </View>
                ) : filteredAdvertisements.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.emptyText}>Brak wyników</Text>
                        <Text style={styles.emptySubtext}>
                            Nie znaleziono ogłoszeń pasujących do "{searchQuery}"
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredAdvertisements}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContainer}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.adCard}
                                onPress={() => openDetails(item)}
                            >
                                <Image
                                    source={{ uri: item.imageUri }}
                                    style={styles.thumbnail}
                                    resizeMode="cover"
                                />
                                <View style={styles.adInfo}>
                                    <Text style={styles.adDescription} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                    <Text style={styles.adUrl} numberOfLines={1}>
                                        {item.url}
                                    </Text>
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
                            </TouchableOpacity>
                        )}
                    />
                )}

                {/* Licznik ogłoszeń */}
                <View style={styles.counterContainer}>
                    <Text style={styles.counterText}>
                        Ogłoszenia: {advertisements.length} / 5
                    </Text>
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
                Alert.alert('Błąd', 'Wybierz zdjęcie');
                return;
            }
            if (!description.trim()) {
                Alert.alert('Błąd', 'Wpisz opis');
                return;
            }
            if (!url.trim()) {
                Alert.alert('Błąd', 'Wpisz link');
                return;
            }
            addAdvertisement(imageUri, description.trim(), url.trim());
        };

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setCurrentScreen('Home')}
                    >
                        <Text style={styles.backButtonText}>← Wróć</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Nowe Ogłoszenie</Text>
                </View>

                <ScrollView style={styles.formContainer}>
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Zdjęcie ogłoszenia</Text>
                        <TouchableOpacity
                            style={styles.imagePicker}
                            onPress={handlePickImage}
                            disabled={isPickingImage}
                        >
                            {isPickingImage ? (
                                <ActivityIndicator size="large" color="#007AFF" />
                            ) : imageUri ? (
                                <Image
                                    source={{ uri: imageUri }}
                                    style={styles.selectedImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={styles.imagePickerPlaceholder}>
                                    <Text style={styles.imagePickerText}>📷</Text>
                                    <Text style={styles.imagePickerSubtext}>Wybierz z galerii</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Opis</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Wpisz krótki opis ogłoszenia..."
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Link</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="https://..."
                            value={url}
                            onChangeText={setUrl}
                            keyboardType="url"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Zapisz Ogłoszenie</Text>
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
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setCurrentScreen('Home')}
                    >
                        <Text style={styles.backButtonText}>← Wróć</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Szczegóły</Text>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteAdvertisement(selectedAd.id)}
                    >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.detailsContainer}>
                    <Image
                        source={{ uri: selectedAd.imageUri }}
                        style={styles.detailsImage}
                        resizeMode="contain"
                    />

                    <View style={styles.detailsInfo}>
                        <Text style={styles.detailsLabel}>Opis:</Text>
                        <Text style={styles.detailsDescription}>{selectedAd.description}</Text>

                        <Text style={styles.detailsLabel}>Link:</Text>
                        <TouchableOpacity onPress={handleOpenLink}>
                            <Text style={styles.detailsLink}>{selectedAd.url}</Text>
                        </TouchableOpacity>

                        <Text style={styles.detailsLabel}>Data dodania:</Text>
                        <Text style={styles.detailsDate}>
                            {new Date(selectedAd.createdAt).toLocaleString('pl-PL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    };

    // Renderowanie odpowiedniego ekranu
    return (
        <>
            <StatusBar barStyle="dark-content" />
            {currentScreen === 'Home' && <HomeScreen />}
            {currentScreen === 'Add' && <AddScreen />}
            {currentScreen === 'Details' && <DetailsScreen />}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000000'
    },
    addButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600'
    },
    backButton: {
        paddingVertical: 8
    },
    backButtonText: {
        color: '#007AFF',
        fontSize: 16
    },
    deleteButton: {
        paddingVertical: 8,
        paddingHorizontal: 8
    },
    deleteButtonText: {
        fontSize: 20
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyText: {
        fontSize: 18,
        color: '#666666',
        marginBottom: 8
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999999'
    },
    listContainer: {
        padding: 16
    },
    adCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    thumbnail: {
        width: 100,
        height: 100
    },
    adInfo: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between'
    },
    adDescription: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000000',
        marginBottom: 4
    },
    adUrl: {
        fontSize: 12,
        color: '#007AFF',
        marginBottom: 4
    },
    adDate: {
        fontSize: 11,
        color: '#999999'
    },
    formContainer: {
        flex: 1,
        padding: 16
    },
    formSection: {
        marginBottom: 24
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 8
    },
    imagePicker: {
        width: '100%',
        height: 200,
        backgroundColor: '#F0F0F0',
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed'
    },
    imagePickerPlaceholder: {
        alignItems: 'center'
    },
    imagePickerText: {
        fontSize: 48,
        marginBottom: 8
    },
    imagePickerSubtext: {
        fontSize: 14,
        color: '#666666'
    },
    selectedImage: {
        width: '100%',
        height: '100%'
    },
    textInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#000000'
    },
    saveButton: {
        backgroundColor: '#34C759',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 32
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600'
    },
    detailsContainer: {
        flex: 1
    },
    detailsImage: {
        width: '100%',
        height: 300,
        backgroundColor: '#000000'
    },
    detailsInfo: {
        padding: 16
    },
    detailsLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666666',
        marginTop: 16,
        marginBottom: 4
    },
    detailsDescription: {
        fontSize: 16,
        color: '#000000',
        lineHeight: 24
    },
    detailsLink: {
        fontSize: 16,
        color: '#007AFF',
        textDecorationLine: 'underline'
    },
    detailsDate: {
        fontSize: 16,
        color: '#000000'
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2
    },
    searchIcon: {
        fontSize: 18,
        marginRight: 8,
        color: '#666666'
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#000000',
        padding: 0
    },
    clearButton: {
        padding: 4,
        marginLeft: 8
    },
    clearButtonText: {
        fontSize: 18,
        color: '#999999',
        fontWeight: '600'
    },
    counterContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        alignItems: 'center'
    },
    counterText: {
        fontSize: 12,
        color: '#666666',
        fontWeight: '500'
    }
});