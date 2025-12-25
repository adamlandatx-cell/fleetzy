// Fleetzy Translation System
// Complete English and Spanish translations for all pages

const translations = {
    en: {
        // Landing Page (index.html)
        index: {
            nav: {
                howItWorks: "How It Works",
                pricing: "Pricing",
                vehicles: "Vehicles",
                faq: "FAQ"
            },
            hero: {
                title: "Drive Your Dreams,",
                titleHighlight: "Rent Smart",
                subtitle: "Reliable weekly car rentals for gig economy drivers. No credit check, fast approval, affordable rates.",
                badges: {
                    noCredit: "No Credit Check",
                    fastApproval: "Fast Approval",
                    rideshareApproved: "Rideshare Approved"
                }
            },
            stats: {
                vehiclesAvailable: "Vehicles Available",
                approvalTime: "Approval Time",
                rideshareApproved: "Rideshare Approved",
                weeklyRate: "Weekly Rate"
            },
            pricing: {
                title: "Simple, Transparent Pricing",
                subtitle: "Choose the plan that works for you",
                individual: {
                    title: "Personal Rental",
                    perWeek: "/week",
                    features: {
                        rideshareApproved: "Rideshare Approved",
                        deposit: "$500 Refundable Deposit",
                        paymentMethods: "Flexible Payment Methods",
                        roadside: "24/7 Roadside Assistance"
                    }
                },
                corporate: {
                    title: "Corporate Rental",
                    perVehicle: "/vehicle",
                    badge: "Best for Companies",
                    features: {
                        volumeDiscounts: "Volume Discounts Available",
                        idealFor: "Ideal for delivery/rideshare companies",
                        hrOnboarding: "HR Onboarding Support",
                        accountManager: "Dedicated Account Manager"
                    }
                },
                deposit: "$500 Security Deposit",
                cta: "Contact Us"
            },
            howItWorks: {
                title: "How It Works"
            }
        },
        common: {
            buttons: {
                applyNow: "Apply Now",
                startApplication: "Start Application",
                learnMore: "Learn More"
            },
            pricing: {
                perWeek: "/week",
                deposit: "Deposit"
            }
        },
        
        // Application Page
        application: {
            pageTitle: "Apply Now - Fleetzy Car Rental",
            header: {
                needHelp: "Need help? ",
                phone: "(281) 271-3900"
            },
            progress: {
                steps: {
                    personal: "Personal Info",
                    vehicle: "Select Vehicle",
                    selfie: "Selfie",
                    license: "Driver's License",
                    income: "Income & Review"
                }
            },
            trustBadges: {
                insured: "100% Insured",
                rating: "4.9/5 Rating",
                drivers: "200+ Active Drivers",
                approval: "24hr Approval"
            },
            step1: {
                title: "Personal Information",
                subtitle: "Tell us about yourself to get started",
                rentalType: {
                    label: "Rental Type",
                    personal: "Personal",
                    personalPrice: "$400/week",
                    company: "Company",
                    companyPrice: "$350-375/week"
                },
                companyInfo: {
                    title: "Company Information",
                    companyName: "Company Name",
                    hrContactName: "HR Contact Name",
                    hrContactEmail: "HR Contact Email",
                    hrContactPhone: "HR Contact Phone",
                    note: "Company rentals require dual signatures. HR rep signs first, driver signs after approval."
                },
                fields: {
                    firstName: "First Name *",
                    lastName: "Last Name *",
                    email: "Email Address *",
                    phone: "Phone Number *",
                    phonePlaceholder: "(281) 555-0123",
                    dateOfBirth: "Date of Birth *",
                    dobNote: "Must be 18 or older to rent",
                    address: "Street Address *",
                    city: "City *",
                    state: "State *",
                    selectState: "Select State",
                    zipCode: "ZIP Code *"
                }
            },
            step2: {
                title: "Choose Your Vehicle",
                subtitle: "Select from our available rideshare-approved vehicles",
                loading: "Loading vehicles...",
                selectVehicle: "Please select a vehicle to continue",
                available: "Available",
                unavailable: "Unavailable",
                perWeek: "/week"
            },
            step3: {
                title: "Take Your Selfie",
                subtitle: "We need a clear photo of your face for identity verification",
                startCamera: "Start Camera",
                uploadGallery: "Upload from Gallery",
                cameraInstruction: "Position your face in the circle",
                capturePhoto: "Capture Photo",
                cancel: "Cancel",
                preview: "Preview:",
                retake: "Retake",
                tips: {
                    title: "Selfie Tips",
                    lighting: "Ensure good lighting on your face",
                    sunglasses: "Remove sunglasses and hat",
                    lookCamera: "Look directly at the camera",
                    faceVisible: "Make sure your entire face is visible"
                }
            },
            step4: {
                title: "Driver's License",
                subtitle: "Upload both sides of your valid driver's license",
                licenseFront: "License Front *",
                licenseBack: "License Back *",
                clickUploadFront: "Click to upload front of license",
                clickUploadBack: "Click to upload back of license",
                fileType: "PNG, JPG up to 10MB",
                licenseNumber: "License Number *",
                licenseState: "License State *",
                expirationDate: "Expiration Date *"
            },
            step5: {
                title: "Income Verification",
                subtitle: "Final step - upload proof of income and review your application",
                incomeSource: {
                    label: "Income Source *",
                    select: "Select Income Source",
                    uber: "Uber Driver",
                    lyft: "Lyft Driver",
                    doordash: "DoorDash Driver",
                    w2: "W-2 Employee",
                    selfEmployed: "Self-Employed",
                    other: "Other"
                },
                incomeProof: {
                    label: "Proof of Income *",
                    upload: "Upload bank statement, pay stub, or earnings report",
                    fileType: "PDF, PNG, JPG up to 10MB"
                },
                terms: "I agree to the rental terms and conditions. I understand that a $250 refundable security deposit is required and will be returned at the end of the rental period (minus any damages). Weekly payments of $400 are due every 7 days. I authorize Fleetzy to run a background check.",
                summary: {
                    title: "Application Summary",
                    weeklyRate: "Weekly Rate:",
                    deposit: "Refundable Deposit:",
                    dueToday: "Due Today:",
                    approvalTime: "Approval Time:",
                    hours: "24 hours"
                }
            },
            buttons: {
                next: "Next Step",
                back: "Back",
                submit: "Submit Application"
            },
            footer: {
                copyright: "© 2025 Fleetzy. All rights reserved.",
                questions: "Questions? Call us at"
            }
        },
        
        // Application Success Page
        applicationSuccess: {
            meta: {
                title: "Application Submitted - Fleetzy"
            },
            title: "Application Submitted! 🎉",
            subtitle: "Thank you for applying to Fleetzy. We've received your application and our team is reviewing it now.",
            nextSteps: {
                title: "What happens next?",
                step1: {
                    title: "Review",
                    description: "We'll review your application within 24 hours"
                },
                step2: {
                    title: "Verification",
                    description: "We'll verify your driver's license and background"
                },
                step3: {
                    title: "Approval",
                    description: "You'll receive a call or text with your approval status"
                },
                step4: {
                    title: "Pickup",
                    description: "Schedule your vehicle pickup and hit the road!"
                }
            },
            applicationDetails: {
                title: "Your Application Details",
                name: "Name:",
                phone: "Phone:",
                email: "Email:",
                type: "Type:"
            },
            contact: {
                title: "Have questions? We're here to help!",
                call: "Call (281) 271-3900",
                backToHome: "Back to Home"
            },
            socialProof: "Trusted by Houston's rideshare drivers",
            footer: {
                copyright: "© 2025 Fleetzy. All rights reserved.",
                location: "Houston, Texas"
            }
        }
    },
    
    es: {
        // Página de Inicio (index.html)
        index: {
            nav: {
                howItWorks: "Cómo Funciona",
                pricing: "Precios",
                vehicles: "Vehículos",
                faq: "Preguntas"
            },
            hero: {
                title: "Conduce Tus Sueños,",
                titleHighlight: "Renta Inteligente",
                subtitle: "Rentas semanales confiables para conductores de gig economy. Sin verificación de crédito, aprobación rápida, tarifas accesibles.",
                badges: {
                    noCredit: "Sin Verificación de Crédito",
                    fastApproval: "Aprobación Rápida",
                    rideshareApproved: "Aprobado para Rideshare"
                }
            },
            stats: {
                vehiclesAvailable: "Vehículos Disponibles",
                approvalTime: "Tiempo de Aprobación",
                rideshareApproved: "Aprobado para Rideshare",
                weeklyRate: "Tarifa Semanal"
            },
            pricing: {
                title: "Precios Simples y Transparentes",
                subtitle: "Elige el plan que funcione para ti",
                individual: {
                    title: "Renta Personal",
                    perWeek: "/semana",
                    features: {
                        rideshareApproved: "Aprobado para Rideshare",
                        deposit: "Depósito Reembolsable de $500",
                        paymentMethods: "Métodos de Pago Flexibles",
                        roadside: "Asistencia en Carretera 24/7"
                    }
                },
                corporate: {
                    title: "Renta Corporativa",
                    perVehicle: "/vehículo",
                    badge: "Mejor para Empresas",
                    features: {
                        volumeDiscounts: "Descuentos por Volumen Disponibles",
                        idealFor: "Ideal para empresas de delivery/rideshare",
                        hrOnboarding: "Soporte de Incorporación de RRHH",
                        accountManager: "Gerente de Cuenta Dedicado"
                    }
                },
                deposit: "Depósito de Seguridad de $500",
                cta: "Contáctanos"
            },
            howItWorks: {
                title: "Cómo Funciona"
            }
        },
        common: {
            buttons: {
                applyNow: "Aplicar Ahora",
                startApplication: "Comenzar Aplicación",
                learnMore: "Saber Más"
            },
            pricing: {
                perWeek: "/semana",
                deposit: "Depósito"
            }
        },
        
        // Página de Aplicación
        application: {
            pageTitle: "Aplicar Ahora - Renta de Autos Fleetzy",
            header: {
                needHelp: "¿Necesitas ayuda? ",
                phone: "(281) 271-3900"
            },
            progress: {
                steps: {
                    personal: "Info Personal",
                    vehicle: "Seleccionar Vehículo",
                    selfie: "Selfie",
                    license: "Licencia de Conducir",
                    income: "Ingresos y Revisión"
                }
            },
            trustBadges: {
                insured: "100% Asegurado",
                rating: "Calificación 4.9/5",
                drivers: "200+ Conductores Activos",
                approval: "Aprobación en 24hrs"
            },
            step1: {
                title: "Información Personal",
                subtitle: "Cuéntanos sobre ti para comenzar",
                rentalType: {
                    label: "Tipo de Renta",
                    personal: "Personal",
                    personalPrice: "$400/semana",
                    company: "Empresa",
                    companyPrice: "$350-375/semana"
                },
                companyInfo: {
                    title: "Información de la Empresa",
                    companyName: "Nombre de la Empresa",
                    hrContactName: "Nombre del Contacto de RRHH",
                    hrContactEmail: "Email del Contacto de RRHH",
                    hrContactPhone: "Teléfono del Contacto de RRHH",
                    note: "Las rentas corporativas requieren firmas duales. El representante de RRHH firma primero, el conductor firma después de la aprobación."
                },
                fields: {
                    firstName: "Nombre *",
                    lastName: "Apellido *",
                    email: "Correo Electrónico *",
                    phone: "Número de Teléfono *",
                    phonePlaceholder: "(281) 555-0123",
                    dateOfBirth: "Fecha de Nacimiento *",
                    dobNote: "Debe tener 18 años o más para rentar",
                    address: "Dirección *",
                    city: "Ciudad *",
                    state: "Estado *",
                    selectState: "Seleccionar Estado",
                    zipCode: "Código Postal *"
                }
            },
            step2: {
                title: "Elige Tu Vehículo",
                subtitle: "Selecciona de nuestros vehículos disponibles aprobados para rideshare",
                loading: "Cargando vehículos...",
                selectVehicle: "Por favor selecciona un vehículo para continuar",
                available: "Disponible",
                unavailable: "No Disponible",
                perWeek: "/semana"
            },
            step3: {
                title: "Toma Tu Selfie",
                subtitle: "Necesitamos una foto clara de tu cara para verificación de identidad",
                startCamera: "Iniciar Cámara",
                uploadGallery: "Subir de Galería",
                cameraInstruction: "Posiciona tu cara en el círculo",
                capturePhoto: "Capturar Foto",
                cancel: "Cancelar",
                preview: "Vista Previa:",
                retake: "Tomar de Nuevo",
                tips: {
                    title: "Consejos para la Selfie",
                    lighting: "Asegura buena iluminación en tu cara",
                    sunglasses: "Quítate las gafas de sol y el sombrero",
                    lookCamera: "Mira directamente a la cámara",
                    faceVisible: "Asegúrate de que toda tu cara sea visible"
                }
            },
            step4: {
                title: "Licencia de Conducir",
                subtitle: "Sube ambos lados de tu licencia de conducir válida",
                licenseFront: "Frente de la Licencia *",
                licenseBack: "Reverso de la Licencia *",
                clickUploadFront: "Haz clic para subir el frente de la licencia",
                clickUploadBack: "Haz clic para subir el reverso de la licencia",
                fileType: "PNG, JPG hasta 10MB",
                licenseNumber: "Número de Licencia *",
                licenseState: "Estado de la Licencia *",
                expirationDate: "Fecha de Expiración *"
            },
            step5: {
                title: "Verificación de Ingresos",
                subtitle: "Último paso - sube prueba de ingresos y revisa tu aplicación",
                incomeSource: {
                    label: "Fuente de Ingresos *",
                    select: "Seleccionar Fuente de Ingresos",
                    uber: "Conductor de Uber",
                    lyft: "Conductor de Lyft",
                    doordash: "Conductor de DoorDash",
                    w2: "Empleado W-2",
                    selfEmployed: "Autónomo",
                    other: "Otro"
                },
                incomeProof: {
                    label: "Prueba de Ingresos *",
                    upload: "Sube estado de cuenta bancario, talón de pago o reporte de ganancias",
                    fileType: "PDF, PNG, JPG hasta 10MB"
                },
                terms: "Acepto los términos y condiciones de renta. Entiendo que se requiere un depósito de seguridad reembolsable de $250 y será devuelto al final del período de renta (menos cualquier daño). Los pagos semanales de $400 vencen cada 7 días. Autorizo a Fleetzy a realizar una verificación de antecedentes.",
                summary: {
                    title: "Resumen de Aplicación",
                    weeklyRate: "Tarifa Semanal:",
                    deposit: "Depósito Reembolsable:",
                    dueToday: "Vence Hoy:",
                    approvalTime: "Tiempo de Aprobación:",
                    hours: "24 horas"
                }
            },
            buttons: {
                next: "Siguiente Paso",
                back: "Atrás",
                submit: "Enviar Aplicación"
            },
            footer: {
                copyright: "© 2025 Fleetzy. Todos los derechos reservados.",
                questions: "¿Preguntas? Llámanos al"
            }
        },
        
        // Página de Éxito de Aplicación
        applicationSuccess: {
            meta: {
                title: "Aplicación Enviada - Fleetzy"
            },
            title: "¡Aplicación Enviada! 🎉",
            subtitle: "Gracias por aplicar a Fleetzy. Hemos recibido tu aplicación y nuestro equipo la está revisando ahora.",
            nextSteps: {
                title: "¿Qué sigue?",
                step1: {
                    title: "Revisión",
                    description: "Revisaremos tu aplicación dentro de 24 horas"
                },
                step2: {
                    title: "Verificación",
                    description: "Verificaremos tu licencia de conducir y antecedentes"
                },
                step3: {
                    title: "Aprobación",
                    description: "Recibirás una llamada o mensaje con tu estado de aprobación"
                },
                step4: {
                    title: "Recogida",
                    description: "¡Programa la recogida de tu vehículo y sal a la carretera!"
                }
            },
            applicationDetails: {
                title: "Detalles de Tu Aplicación",
                name: "Nombre:",
                phone: "Teléfono:",
                email: "Email:",
                type: "Tipo:"
            },
            contact: {
                title: "¿Tienes preguntas? ¡Estamos aquí para ayudar!",
                call: "Llamar (281) 271-3900",
                backToHome: "Volver al Inicio"
            },
            socialProof: "Confiado por conductores de rideshare en Houston",
            footer: {
                copyright: "© 2025 Fleetzy. Todos los derechos reservados.",
                location: "Houston, Texas"
            }
        }
    }
};

// Helper function to get nested translation
function getTranslation(lang, key) {
    const keys = key.split('.');
    let value = translations[lang];
    
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            // Fallback to English if translation not found
            value = translations.en;
            for (const fallbackKey of keys) {
                if (value && typeof value === 'object' && fallbackKey in value) {
                    value = value[fallbackKey];
                } else {
                    console.warn(`Translation not found: ${key}`);
                    return key;
                }
            }
            break;
        }
    }
    
    return value;
}

// Initialize translation system
function initTranslations() {
    const savedLang = localStorage.getItem('fleetzy_language') || 'en';
    applyTranslations(savedLang);
}

// Apply translations to page
function applyTranslations(lang) {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = getTranslation(lang, key);
        
        if (typeof translation === 'string') {
            element.textContent = translation;
        }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const translation = getTranslation(lang, key);
        
        if (typeof translation === 'string') {
            element.placeholder = translation;
        }
    });
    
    // Update page title if exists
    const titleElement = document.querySelector('[data-i18n-title]');
    if (titleElement) {
        const key = titleElement.getAttribute('data-i18n-title');
        const translation = getTranslation(lang, key);
        if (typeof translation === 'string') {
            document.title = translation;
        }
    }
    
    // Save language preference
    localStorage.setItem('fleetzy_language', lang);
    
    // Update html lang attribute
    document.documentElement.lang = lang;
    
    // Dispatch custom event for language change
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
}

// Get current language
function getCurrentLanguage() {
    return localStorage.getItem('fleetzy_language') || 'en';
}

// Switch language
function switchLanguage(lang) {
    if (translations[lang]) {
        applyTranslations(lang);
    } else {
        console.error(`Language not supported: ${lang}`);
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTranslations);
} else {
    initTranslations();
}

// Export for use in other scripts
window.getCurrentLanguage = getCurrentLanguage;
window.switchLanguage = switchLanguage;
window.getTranslation = getTranslation;
