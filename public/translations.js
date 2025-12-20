// ============================================
// FLEETZY TRANSLATIONS - ENGLISH & SPANISH
// ============================================
// Version: 1.0 - December 2025
// Total strings: 445+
// 
// Usage: 
//   t('key.path') - returns translated string
//   t('key.path', {name: 'John'}) - with variable substitution
// ============================================

const TRANSLATIONS = {
    // ============================================
    // COMMON / SHARED
    // ============================================
    common: {
        phone: {
            en: "(281) 271-3900",
            es: "(281) 271-3900"
        },
        email: {
            en: "hello@getfleetzy.com",
            es: "hello@getfleetzy.com"
        },
        location: {
            en: "Houston, Texas",
            es: "Houston, Texas"
        },
        copyright: {
            en: "© 2025 Fleetzy. All rights reserved.",
            es: "© 2025 Fleetzy. Todos los derechos reservados."
        },
        buttons: {
            applyNow: {
                en: "Apply Now",
                es: "Solicitar Ahora"
            },
            startApplication: {
                en: "Start Your Application",
                es: "Comenzar Tu Solicitud"
            },
            learnMore: {
                en: "Learn More",
                es: "Más Información"
            },
            continue: {
                en: "Continue →",
                es: "Continuar →"
            },
            back: {
                en: "← Back",
                es: "← Atrás"
            },
            backToHome: {
                en: "← Back to Home",
                es: "← Volver al Inicio"
            },
            submit: {
                en: "Submit",
                es: "Enviar"
            },
            call: {
                en: "Call",
                es: "Llamar"
            },
            callUs: {
                en: "Call Us",
                es: "Llámanos"
            }
        },
        needHelp: {
            en: "Need help?",
            es: "¿Necesitas ayuda?"
        },
        hours: {
            title: {
                en: "Hours",
                es: "Horario"
            },
            weekdays: {
                en: "Monday - Friday: 9am - 7pm",
                es: "Lunes - Viernes: 9am - 7pm"
            },
            saturday: {
                en: "Saturday: 10am - 5pm",
                es: "Sábado: 10am - 5pm"
            },
            sunday: {
                en: "Sunday: Closed",
                es: "Domingo: Cerrado"
            }
        },
        pricing: {
            perWeek: {
                en: "/week",
                es: "/semana"
            },
            deposit: {
                en: "Refundable deposit",
                es: "Depósito reembolsable"
            },
            dueToday: {
                en: "Due today",
                es: "Total a pagar hoy"
            },
            firstWeek: {
                en: "First week",
                es: "Primera semana"
            }
        }
    },

    // ============================================
    // LANGUAGE SWITCHER
    // ============================================
    languageSwitcher: {
        prompt: {
            title: {
                en: "Prefer Spanish?",
                es: "¿Prefieres Español?"
            },
            message: {
                en: "We noticed your browser is set to Spanish. Would you like to view this site in Spanish?",
                es: "Notamos que tu navegador está en español. ¿Te gustaría ver este sitio en español?"
            },
            yes: {
                en: "Yes, switch to Spanish",
                es: "Sí, cambiar a Español"
            },
            no: {
                en: "No, keep English",
                es: "No, mantener Inglés"
            }
        },
        toggle: {
            en: "English",
            es: "Español"
        }
    },

    // ============================================
    // INDEX / LANDING PAGE
    // ============================================
    index: {
        meta: {
            title: {
                en: "Fleetzy - Weekly Car Rentals | Individual & Corporate Fleet Solutions Houston",
                es: "Fleetzy - Renta Semanal de Autos | Soluciones de Flota Individual y Corporativa Houston"
            },
            description: {
                en: "Weekly car rentals for individual drivers and corporate fleet solutions in Houston, Texas. Rideshare-approved vehicles, flexible terms, 24-hour approval.",
                es: "Renta semanal de autos para conductores individuales y soluciones de flota corporativa en Houston, Texas. Vehículos aprobados para rideshare, términos flexibles, aprobación en 24 horas."
            }
        },
        nav: {
            howItWorks: {
                en: "How It Works",
                es: "Cómo Funciona"
            },
            pricing: {
                en: "Pricing",
                es: "Precios"
            },
            vehicles: {
                en: "Vehicles",
                es: "Vehículos"
            },
            faq: {
                en: "FAQ",
                es: "Preguntas Frecuentes"
            }
        },
        hero: {
            title: {
                en: "Fleet Solutions for",
                es: "Soluciones de Flota para"
            },
            titleHighlight: {
                en: "Drivers & Businesses.",
                es: "Conductores y Negocios."
            },
            subtitle: {
                en: "Weekly car rentals for rideshare drivers and corporate fleet solutions in Houston, Texas. Get approved in 24 hours.",
                es: "Renta semanal de autos para conductores de rideshare y soluciones de flota corporativa en Houston, Texas. Aprobación en 24 horas."
            },
            badges: {
                noCredit: {
                    en: "No credit check required",
                    es: "Sin verificación de crédito"
                },
                fastApproval: {
                    en: "24hr approval",
                    es: "Aprobación en 24hrs"
                },
                rideshareApproved: {
                    en: "Rideshare approved",
                    es: "Aprobado para rideshare"
                }
            }
        },
        howItWorks: {
            title: {
                en: "How It Works",
                es: "Cómo Funciona"
            },
            subtitle: {
                en: "Get on the road in 3 simple steps",
                es: "Ponte en camino en 3 simples pasos"
            },
            step1: {
                title: {
                    en: "Apply Online",
                    es: "Solicita en Línea"
                },
                description: {
                    en: "Fill out our quick application with your driver's license and proof of income. Takes about 5 minutes.",
                    es: "Completa nuestra solicitud rápida con tu licencia de conducir y comprobante de ingresos. Toma aproximadamente 5 minutos."
                }
            },
            step2: {
                title: {
                    en: "Get Approved",
                    es: "Obtén Aprobación"
                },
                description: {
                    en: "We review your application and run a quick background check. Most approvals happen within 24 hours.",
                    es: "Revisamos tu solicitud y hacemos una verificación de antecedentes rápida. La mayoría de las aprobaciones ocurren en 24 horas."
                }
            },
            step3: {
                title: {
                    en: "Pick Up & Drive",
                    es: "Recoge y Conduce"
                },
                description: {
                    en: "Once approved, schedule your pickup and start earning. All vehicles are rideshare-ready.",
                    es: "Una vez aprobado, programa tu recogida y empieza a ganar. Todos los vehículos están listos para rideshare."
                }
            }
        },
        pricing: {
            title: {
                en: "Simple, Transparent Pricing",
                es: "Precios Simples y Transparentes"
            },
            subtitle: {
                en: "No hidden fees. No surprises. Just reliable transportation.",
                es: "Sin cargos ocultos. Sin sorpresas. Solo transporte confiable."
            },
            individual: {
                title: {
                    en: "Individual Driver",
                    es: "Conductor Individual"
                },
                price: {
                    en: "$400",
                    es: "$400"
                },
                features: {
                    rideshareApproved: {
                        en: "Rideshare & delivery approved",
                        es: "Aprobado para rideshare y entregas"
                    },
                    insurance: {
                        en: "Full insurance coverage",
                        es: "Cobertura de seguro completa"
                    },
                    roadside: {
                        en: "24/7 roadside assistance",
                        es: "Asistencia en carretera 24/7"
                    },
                    flexible: {
                        en: "Flexible week-to-week",
                        es: "Flexible semana a semana"
                    },
                    maintenance: {
                        en: "Free maintenance included",
                        es: "Mantenimiento gratuito incluido"
                    }
                },
                deposit: {
                    en: "$250 refundable deposit",
                    es: "$250 depósito reembolsable"
                }
            },
            corporate: {
                title: {
                    en: "Corporate Fleet",
                    es: "Flota Corporativa"
                },
                price: {
                    en: "$350-375",
                    es: "$350-375"
                },
                perVehicle: {
                    en: "per vehicle",
                    es: "por vehículo"
                },
                features: {
                    volumeDiscounts: {
                        en: "Volume discounts available",
                        es: "Descuentos por volumen disponibles"
                    },
                    accountManager: {
                        en: "Dedicated account manager",
                        es: "Gerente de cuenta dedicado"
                    },
                    consolidatedBilling: {
                        en: "Consolidated billing",
                        es: "Facturación consolidada"
                    },
                    prioritySupport: {
                        en: "Priority vehicle replacement",
                        es: "Reemplazo prioritario de vehículos"
                    },
                    customTerms: {
                        en: "Custom rental terms",
                        es: "Términos de renta personalizados"
                    }
                },
                cta: {
                    en: "Contact for quote",
                    es: "Contáctanos para cotización"
                }
            }
        },
        vehicles: {
            title: {
                en: "Our Fleet",
                es: "Nuestra Flota"
            },
            subtitle: {
                en: "Reliable, well-maintained vehicles ready for rideshare and delivery",
                es: "Vehículos confiables y bien mantenidos listos para rideshare y entregas"
            },
            features: {
                rideshareApproved: {
                    en: "Rideshare Approved",
                    es: "Aprobado para Rideshare"
                },
                fuelEfficient: {
                    en: "Fuel Efficient",
                    es: "Eficiente en Combustible"
                },
                wellMaintained: {
                    en: "Well Maintained",
                    es: "Bien Mantenido"
                }
            }
        },
        benefits: {
            title: {
                en: "Why Choose Fleetzy?",
                es: "¿Por Qué Elegir Fleetzy?"
            },
            noCredit: {
                title: {
                    en: "No Credit Check",
                    es: "Sin Verificación de Crédito"
                },
                description: {
                    en: "We focus on your driving record and income, not your credit score. Bad credit? No problem.",
                    es: "Nos enfocamos en tu historial de manejo e ingresos, no en tu puntaje de crédito. ¿Mal crédito? No hay problema."
                }
            },
            fastApproval: {
                title: {
                    en: "24-Hour Approval",
                    es: "Aprobación en 24 Horas"
                },
                description: {
                    en: "Apply today, get approved tomorrow. We know you need to start earning quickly.",
                    es: "Solicita hoy, obtén aprobación mañana. Sabemos que necesitas empezar a ganar rápidamente."
                }
            },
            flexibility: {
                title: {
                    en: "Flexible Qualification",
                    es: "Calificación Flexible"
                },
                description: {
                    en: "Streamlined approval process for individuals and businesses. We focus on reliability, not just credit scores.",
                    es: "Proceso de aprobación simplificado para individuos y negocios. Nos enfocamos en la confiabilidad, no solo en puntajes de crédito."
                }
            }
        },
        faq: {
            title: {
                en: "Frequently Asked Questions",
                es: "Preguntas Frecuentes"
            },
            subtitle: {
                en: "Everything you need to know about renting with Fleetzy",
                es: "Todo lo que necesitas saber sobre rentar con Fleetzy"
            },
            q1: {
                question: {
                    en: "How long does the approval process take?",
                    es: "¿Cuánto tiempo toma el proceso de aprobación?"
                },
                answer: {
                    en: "Most applications are approved within 24 hours. We run a quick background check and verify your documents. Once approved, you can pick up your vehicle the same day.",
                    es: "La mayoría de las solicitudes se aprueban en 24 horas. Hacemos una verificación de antecedentes rápida y verificamos tus documentos. Una vez aprobado, puedes recoger tu vehículo el mismo día."
                }
            },
            q2: {
                question: {
                    en: "What do I need to apply?",
                    es: "¿Qué necesito para solicitar?"
                },
                answer: {
                    en: "You'll need a valid driver's license, proof of income (bank statements or rideshare earnings), and a selfie for identity verification. The entire application takes about 5 minutes.",
                    es: "Necesitarás una licencia de conducir válida, comprobante de ingresos (estados de cuenta bancarios o ganancias de rideshare), y una selfie para verificación de identidad. Toda la solicitud toma aproximadamente 5 minutos."
                }
            },
            q3: {
                question: {
                    en: "When do I pay my weekly rental fee?",
                    es: "¿Cuándo pago mi tarifa de renta semanal?"
                },
                answer: {
                    en: "Weekly payments are due every 7 days from your pickup date. We'll send you automated reminders 2 days before payment is due. You can pay via Zelle, CashApp, Venmo, PayPal, or card.",
                    es: "Los pagos semanales vencen cada 7 días desde tu fecha de recogida. Te enviaremos recordatorios automáticos 2 días antes del vencimiento. Puedes pagar por Zelle, CashApp, Venmo, PayPal o tarjeta."
                }
            },
            q4: {
                question: {
                    en: "Is the $500 deposit refundable?",
                    es: "¿El depósito de $500 es reembolsable?"
                },
                answer: {
                    en: "Yes! The $500 security deposit is fully refundable at the end of your rental, provided there's no damage to the vehicle and all payments are up to date.",
                    es: "¡Sí! El depósito de seguridad de $500 es completamente reembolsable al final de tu renta, siempre que no haya daños al vehículo y todos los pagos estén al día."
                }
            },
            q5: {
                question: {
                    en: "Are your vehicles approved for Uber and Lyft?",
                    es: "¿Sus vehículos están aprobados para Uber y Lyft?"
                },
                answer: {
                    en: "Absolutely! All Fleetzy vehicles meet the requirements for Uber, Lyft, and DoorDash in Houston. You can start driving immediately after pickup.",
                    es: "¡Absolutamente! Todos los vehículos de Fleetzy cumplen con los requisitos de Uber, Lyft y DoorDash en Houston. Puedes empezar a conducir inmediatamente después de recoger el vehículo."
                }
            },
            q6: {
                question: {
                    en: "What happens if the car breaks down?",
                    es: "¿Qué pasa si el auto se descompone?"
                },
                answer: {
                    en: "We provide 24/7 roadside assistance. If there's a mechanical issue, we'll either repair it quickly or swap you into another vehicle at no additional cost.",
                    es: "Proporcionamos asistencia en carretera 24/7. Si hay un problema mecánico, lo repararemos rápidamente o te cambiaremos a otro vehículo sin costo adicional."
                }
            },
            q7: {
                question: {
                    en: "Can I rent for less than a week?",
                    es: "¿Puedo rentar por menos de una semana?"
                },
                answer: {
                    en: "Our minimum rental period is 2 weeks, but you can continue renting week-to-week after that for as long as you need.",
                    es: "Nuestro período mínimo de renta es de 2 semanas, pero después puedes continuar rentando semana a semana por el tiempo que necesites."
                }
            }
        },
        cta: {
            title: {
                en: "Ready to Get Started?",
                es: "¿Listo para Comenzar?"
            },
            subtitle: {
                en: "Join Houston's trusted fleet partner. Individual drivers and corporate fleets approved in 24 hours.",
                es: "Únete al socio de flota de confianza de Houston. Conductores individuales y flotas corporativas aprobados en 24 horas."
            },
            button: {
                en: "Apply Today - It's Free!",
                es: "¡Solicita Hoy - Es Gratis!"
            },
            footnote: {
                en: "Takes only 5 minutes • Fast approval • Flexible terms",
                es: "Solo toma 5 minutos • Aprobación rápida • Términos flexibles"
            }
        },
        footer: {
            description: {
                en: "Weekly car rentals for individual drivers and corporate fleet solutions in Houston, Texas.",
                es: "Renta semanal de autos para conductores individuales y soluciones de flota corporativa en Houston, Texas."
            },
            quickLinks: {
                en: "Quick Links",
                es: "Enlaces Rápidos"
            },
            contact: {
                en: "Contact",
                es: "Contacto"
            }
        },
        pwa: {
            installApp: {
                en: "Install App",
                es: "Instalar App"
            },
            offlineMessage: {
                en: "You're offline. Some features may be limited.",
                es: "Estás sin conexión. Algunas funciones pueden estar limitadas."
            }
        }
    },

    // ============================================
    // QUALIFY / PRE-QUALIFICATION PAGE
    // ============================================
    qualify: {
        meta: {
            title: {
                en: "See If You Qualify - Fleetzy",
                es: "Verifica Si Calificas - Fleetzy"
            },
            description: {
                en: "See if you qualify for Fleetzy weekly car rental in Houston, Texas. Fast 60-second check.",
                es: "Verifica si calificas para la renta semanal de autos de Fleetzy en Houston, Texas. Verificación rápida de 60 segundos."
            }
        },
        progress: {
            step: {
                en: "Step",
                es: "Paso"
            },
            of: {
                en: "of",
                es: "de"
            }
        },
        // Entry / Path Selection
        entry: {
            title: {
                en: "What brings you to Fleetzy?",
                es: "¿Qué te trae a Fleetzy?"
            },
            subtitle: {
                en: "We'll customize your experience based on your needs.",
                es: "Personalizaremos tu experiencia según tus necesidades."
            },
            options: {
                gig: {
                    title: {
                        en: "I drive for rideshare/delivery",
                        es: "Conduzco para rideshare/entregas"
                    },
                    subtitle: {
                        en: "Uber, Lyft, DoorDash, etc.",
                        es: "Uber, Lyft, DoorDash, etc."
                    }
                },
                corporate: {
                    title: {
                        en: "My company needs vehicles",
                        es: "Mi empresa necesita vehículos"
                    },
                    subtitle: {
                        en: "Fleet rentals for employees",
                        es: "Rentas de flota para empleados"
                    }
                },
                temporary: {
                    title: {
                        en: "I need temporary transportation",
                        es: "Necesito transporte temporal"
                    },
                    subtitle: {
                        en: "Car in shop, between vehicles, etc.",
                        es: "Auto en el taller, entre vehículos, etc."
                    }
                },
                fresh: {
                    title: {
                        en: "I'm starting fresh",
                        es: "Estoy comenzando de nuevo"
                    },
                    subtitle: {
                        en: "New to gig work, need a vehicle to start",
                        es: "Nuevo en trabajo gig, necesito un vehículo para empezar"
                    }
                }
            }
        },
        // GIG Driver Path
        gig: {
            experience: {
                title: {
                    en: "How long have you been driving?",
                    es: "¿Cuánto tiempo llevas conduciendo?"
                },
                subtitle: {
                    en: "Your experience helps us find the right vehicle for you.",
                    es: "Tu experiencia nos ayuda a encontrar el vehículo adecuado para ti."
                },
                options: {
                    twoPlus: {
                        title: {
                            en: "2+ years",
                            es: "2+ años"
                        },
                        subtitle: {
                            en: "Experienced driver",
                            es: "Conductor experimentado"
                        }
                    },
                    oneTwo: {
                        title: {
                            en: "1-2 years",
                            es: "1-2 años"
                        },
                        subtitle: {
                            en: "Solid experience",
                            es: "Experiencia sólida"
                        }
                    },
                    sixTwelve: {
                        title: {
                            en: "6-12 months",
                            es: "6-12 meses"
                        },
                        subtitle: {
                            en: "Getting established",
                            es: "Estableciéndose"
                        }
                    },
                    lessSix: {
                        title: {
                            en: "Less than 6 months",
                            es: "Menos de 6 meses"
                        },
                        subtitle: {
                            en: "Just getting started",
                            es: "Apenas comenzando"
                        }
                    }
                }
            },
            platforms: {
                title: {
                    en: "Which platforms do you drive for?",
                    es: "¿Para qué plataformas conduces?"
                },
                subtitle: {
                    en: "Select all that apply.",
                    es: "Selecciona todas las que apliquen."
                },
                options: {
                    uber: { en: "Uber", es: "Uber" },
                    lyft: { en: "Lyft", es: "Lyft" },
                    doordash: { en: "DoorDash", es: "DoorDash" },
                    uberEats: { en: "Uber Eats", es: "Uber Eats" },
                    instacart: { en: "Instacart", es: "Instacart" },
                    amazonFlex: { en: "Amazon Flex", es: "Amazon Flex" }
                }
            },
            earnings: {
                title: {
                    en: "What are your weekly earnings?",
                    es: "¿Cuáles son tus ganancias semanales?"
                },
                subtitle: {
                    en: "This helps us ensure the rental fits your budget.",
                    es: "Esto nos ayuda a asegurar que la renta se ajuste a tu presupuesto."
                },
                options: {
                    fifteen: {
                        title: {
                            en: "$1,500+ per week",
                            es: "$1,500+ por semana"
                        },
                        subtitle: {
                            en: "Full-time driver",
                            es: "Conductor de tiempo completo"
                        }
                    },
                    tenFifteen: {
                        title: {
                            en: "$1,000 - $1,500 per week",
                            es: "$1,000 - $1,500 por semana"
                        },
                        subtitle: {
                            en: "Consistent earner",
                            es: "Ingresos consistentes"
                        }
                    },
                    fiveTen: {
                        title: {
                            en: "$500 - $1,000 per week",
                            es: "$500 - $1,000 por semana"
                        },
                        subtitle: {
                            en: "Part-time driver",
                            es: "Conductor de medio tiempo"
                        }
                    },
                    lessFive: {
                        title: {
                            en: "Less than $500 per week",
                            es: "Menos de $500 por semana"
                        },
                        subtitle: {
                            en: "Just starting or casual",
                            es: "Apenas comenzando o casual"
                        }
                    }
                }
            },
            eligibility: {
                title: {
                    en: "Quick eligibility check",
                    es: "Verificación rápida de elegibilidad"
                },
                subtitle: {
                    en: "Last step before we show you your options.",
                    es: "Último paso antes de mostrarte tus opciones."
                },
                checkboxes: {
                    age: {
                        en: "I am 25 years or older",
                        es: "Tengo 25 años o más"
                    },
                    license: {
                        en: "I have a valid driver's license",
                        es: "Tengo una licencia de conducir válida"
                    },
                    background: {
                        en: "I can pass a background check",
                        es: "Puedo pasar una verificación de antecedentes"
                    }
                },
                button: {
                    en: "Check Eligibility →",
                    es: "Verificar Elegibilidad →"
                }
            }
        },
        // Corporate Path
        corporate: {
            company: {
                title: {
                    en: "Tell us about your company",
                    es: "Cuéntanos sobre tu empresa"
                },
                subtitle: {
                    en: "We'll create a custom fleet solution for your needs.",
                    es: "Crearemos una solución de flota personalizada para tus necesidades."
                },
                fields: {
                    companyName: {
                        label: {
                            en: "Company Name",
                            es: "Nombre de la Empresa"
                        },
                        placeholder: {
                            en: "ABC Corporation",
                            es: "Corporación ABC"
                        }
                    },
                    industry: {
                        label: {
                            en: "Industry",
                            es: "Industria"
                        },
                        placeholder: {
                            en: "Transportation, Logistics, etc.",
                            es: "Transporte, Logística, etc."
                        }
                    }
                }
            },
            fleet: {
                title: {
                    en: "How many vehicles do you need?",
                    es: "¿Cuántos vehículos necesitas?"
                },
                subtitle: {
                    en: "Volume discounts available for 5+ vehicles.",
                    es: "Descuentos por volumen disponibles para 5+ vehículos."
                },
                options: {
                    oneTwo: {
                        title: {
                            en: "1-2 vehicles",
                            es: "1-2 vehículos"
                        },
                        subtitle: {
                            en: "Small team",
                            es: "Equipo pequeño"
                        }
                    },
                    threeFive: {
                        title: {
                            en: "3-5 vehicles",
                            es: "3-5 vehículos"
                        },
                        subtitle: {
                            en: "Growing team",
                            es: "Equipo en crecimiento"
                        }
                    },
                    fivePlus: {
                        title: {
                            en: "5+ vehicles",
                            es: "5+ vehículos"
                        },
                        subtitle: {
                            en: "Full fleet - custom pricing",
                            es: "Flota completa - precios personalizados"
                        }
                    }
                }
            },
            duration: {
                title: {
                    en: "How long do you need the vehicles?",
                    es: "¿Por cuánto tiempo necesitas los vehículos?"
                },
                subtitle: {
                    en: "Longer terms get better rates.",
                    es: "Términos más largos obtienen mejores tarifas."
                },
                options: {
                    oneThree: {
                        title: {
                            en: "1-3 months",
                            es: "1-3 meses"
                        },
                        subtitle: {
                            en: "Short-term project",
                            es: "Proyecto a corto plazo"
                        }
                    },
                    threeSix: {
                        title: {
                            en: "3-6 months",
                            es: "3-6 meses"
                        },
                        subtitle: {
                            en: "Extended project",
                            es: "Proyecto extendido"
                        }
                    },
                    sixPlus: {
                        title: {
                            en: "6+ months",
                            es: "6+ meses"
                        },
                        subtitle: {
                            en: "Long-term - best rates!",
                            es: "Largo plazo - ¡mejores tarifas!"
                        }
                    },
                    ongoing: {
                        title: {
                            en: "Ongoing / Indefinite",
                            es: "Continuo / Indefinido"
                        },
                        subtitle: {
                            en: "Permanent fleet solution",
                            es: "Solución de flota permanente"
                        }
                    }
                }
            }
        },
        // Temporary Path
        temporary: {
            reason: {
                title: {
                    en: "Why do you need temporary transportation?",
                    es: "¿Por qué necesitas transporte temporal?"
                },
                subtitle: {
                    en: "This helps us understand your situation.",
                    es: "Esto nos ayuda a entender tu situación."
                },
                options: {
                    carInShop: {
                        title: {
                            en: "My car is in the shop",
                            es: "Mi auto está en el taller"
                        },
                        subtitle: {
                            en: "Need wheels while it's being fixed",
                            es: "Necesito ruedas mientras lo reparan"
                        }
                    },
                    betweenVehicles: {
                        title: {
                            en: "Between vehicles",
                            es: "Entre vehículos"
                        },
                        subtitle: {
                            en: "Sold my car, waiting on new one",
                            es: "Vendí mi auto, esperando uno nuevo"
                        }
                    },
                    visiting: {
                        title: {
                            en: "Visiting Houston",
                            es: "Visitando Houston"
                        },
                        subtitle: {
                            en: "Extended stay, need reliable transport",
                            es: "Estadía extendida, necesito transporte confiable"
                        }
                    },
                    other: {
                        title: {
                            en: "Other reason",
                            es: "Otra razón"
                        },
                        subtitle: {
                            en: "Something else entirely",
                            es: "Algo completamente diferente"
                        }
                    }
                }
            },
            duration: {
                title: {
                    en: "How long do you need the vehicle?",
                    es: "¿Por cuánto tiempo necesitas el vehículo?"
                },
                subtitle: {
                    en: "Minimum rental is 2 weeks.",
                    es: "La renta mínima es de 2 semanas."
                },
                options: {
                    twoFour: {
                        title: {
                            en: "2-4 weeks",
                            es: "2-4 semanas"
                        },
                        subtitle: {
                            en: "Quick fix",
                            es: "Solución rápida"
                        }
                    },
                    oneTwo: {
                        title: {
                            en: "1-2 months",
                            es: "1-2 meses"
                        },
                        subtitle: {
                            en: "Extended period",
                            es: "Período extendido"
                        }
                    },
                    notSure: {
                        title: {
                            en: "Not sure yet",
                            es: "No estoy seguro aún"
                        },
                        subtitle: {
                            en: "Flexible week-to-week",
                            es: "Flexible semana a semana"
                        }
                    }
                }
            },
            employment: {
                title: {
                    en: "What's your employment status?",
                    es: "¿Cuál es tu situación laboral?"
                },
                subtitle: {
                    en: "This helps us verify you can afford the rental.",
                    es: "Esto nos ayuda a verificar que puedes pagar la renta."
                },
                options: {
                    employed: {
                        title: {
                            en: "Employed (W-2)",
                            es: "Empleado (W-2)"
                        },
                        subtitle: {
                            en: "Regular paycheck",
                            es: "Cheque de pago regular"
                        }
                    },
                    selfEmployed: {
                        title: {
                            en: "Self-employed",
                            es: "Trabajador independiente"
                        },
                        subtitle: {
                            en: "Business owner or contractor",
                            es: "Dueño de negocio o contratista"
                        }
                    },
                    gigWorker: {
                        title: {
                            en: "Gig worker",
                            es: "Trabajador gig"
                        },
                        subtitle: {
                            en: "Uber, DoorDash, etc.",
                            es: "Uber, DoorDash, etc."
                        }
                    },
                    unemployed: {
                        title: {
                            en: "Currently unemployed",
                            es: "Actualmente desempleado"
                        },
                        subtitle: {
                            en: "Between jobs",
                            es: "Entre trabajos"
                        }
                    }
                }
            }
        },
        // Fresh Start Path
        fresh: {
            platform: {
                title: {
                    en: "Are you already approved on a gig platform?",
                    es: "¿Ya estás aprobado en una plataforma gig?"
                },
                subtitle: {
                    en: "This helps us understand your readiness.",
                    es: "Esto nos ayuda a entender tu preparación."
                },
                options: {
                    approved: {
                        title: {
                            en: "Yes, I'm approved",
                            es: "Sí, estoy aprobado"
                        },
                        subtitle: {
                            en: "Just need a vehicle to start driving",
                            es: "Solo necesito un vehículo para empezar a conducir"
                        }
                    },
                    pending: {
                        title: {
                            en: "Application pending",
                            es: "Solicitud pendiente"
                        },
                        subtitle: {
                            en: "Waiting for approval",
                            es: "Esperando aprobación"
                        }
                    },
                    notYet: {
                        title: {
                            en: "Not yet applied",
                            es: "Aún no he solicitado"
                        },
                        subtitle: {
                            en: "Haven't started the process",
                            es: "No he comenzado el proceso"
                        }
                    }
                }
            },
            income: {
                title: {
                    en: "Do you have other income while you get started?",
                    es: "¿Tienes otros ingresos mientras comienzas?"
                },
                subtitle: {
                    en: "This helps us assess your ability to cover weekly payments.",
                    es: "Esto nos ayuda a evaluar tu capacidad para cubrir los pagos semanales."
                },
                options: {
                    hasJob: {
                        title: {
                            en: "Yes, I have a job",
                            es: "Sí, tengo un trabajo"
                        },
                        subtitle: {
                            en: "Gig driving will be additional income",
                            es: "Conducir gig será ingreso adicional"
                        }
                    },
                    hasSavings: {
                        title: {
                            en: "Yes, I have savings",
                            es: "Sí, tengo ahorros"
                        },
                        subtitle: {
                            en: "Can cover a few weeks while I ramp up",
                            es: "Puedo cubrir algunas semanas mientras me establezco"
                        }
                    },
                    noOther: {
                        title: {
                            en: "No other income",
                            es: "Sin otros ingresos"
                        },
                        subtitle: {
                            en: "This will be my only income source",
                            es: "Esta será mi única fuente de ingresos"
                        }
                    }
                }
            }
        },
        // Success Screens
        success: {
            standard: {
                title: {
                    en: "Great news! You're pre-qualified! 🎉",
                    es: "¡Buenas noticias! ¡Estás pre-calificado! 🎉"
                },
                subtitle: {
                    en: "Based on your answers, you're a great fit for Fleetzy.",
                    es: "Basado en tus respuestas, eres una excelente opción para Fleetzy."
                },
                rateLabel: {
                    en: "Your weekly rate",
                    es: "Tu tarifa semanal"
                },
                whatsIncluded: {
                    title: {
                        en: "What's included:",
                        es: "Qué está incluido:"
                    },
                    items: {
                        rideshare: {
                            en: "Rideshare & delivery approved vehicle",
                            es: "Vehículo aprobado para rideshare y entregas"
                        },
                        insurance: {
                            en: "Full insurance coverage",
                            es: "Cobertura de seguro completa"
                        },
                        roadside: {
                            en: "24/7 roadside assistance",
                            es: "Asistencia en carretera 24/7"
                        },
                        flexible: {
                            en: "Flexible week-to-week terms",
                            es: "Términos flexibles semana a semana"
                        },
                        depositReturn: {
                            en: "Deposit returned when you're done",
                            es: "Depósito devuelto cuando termines"
                        }
                    }
                },
                form: {
                    name: {
                        label: {
                            en: "Your Name",
                            es: "Tu Nombre"
                        },
                        placeholder: {
                            en: "John Smith",
                            es: "Juan García"
                        }
                    },
                    phone: {
                        label: {
                            en: "Phone Number",
                            es: "Número de Teléfono"
                        },
                        placeholder: {
                            en: "(555) 123-4567",
                            es: "(555) 123-4567"
                        }
                    },
                    email: {
                        label: {
                            en: "Email (optional)",
                            es: "Correo Electrónico (opcional)"
                        },
                        placeholder: {
                            en: "john@email.com",
                            es: "juan@email.com"
                        }
                    }
                },
                button: {
                    en: "Complete My Application →",
                    es: "Completar Mi Solicitud →"
                },
                footnote: {
                    en: "Takes about 5 minutes. We'll text you a link.",
                    es: "Toma aproximadamente 5 minutos. Te enviaremos un enlace por mensaje de texto."
                }
            },
            corporate: {
                title: {
                    en: "Perfect for your business! 🏢",
                    es: "¡Perfecto para tu negocio! 🏢"
                },
                subtitle: {
                    en: "Corporate clients get special rates and dedicated support.",
                    es: "Los clientes corporativos obtienen tarifas especiales y soporte dedicado."
                },
                badge: {
                    en: "CORPORATE RATE",
                    es: "TARIFA CORPORATIVA"
                },
                rateLabel: {
                    en: "Per vehicle weekly rate",
                    es: "Tarifa semanal por vehículo"
                },
                savings: {
                    en: "$50/week savings vs standard",
                    es: "$50/semana de ahorro vs estándar"
                },
                duePerVehicle: {
                    en: "Due per vehicle",
                    es: "Total por vehículo"
                },
                benefits: {
                    title: {
                        en: "Corporate benefits:",
                        es: "Beneficios corporativos:"
                    },
                    items: {
                        accountManager: {
                            en: "Dedicated account manager",
                            es: "Gerente de cuenta dedicado"
                        },
                        volumeDiscounts: {
                            en: "Volume discounts for 5+ vehicles",
                            es: "Descuentos por volumen para 5+ vehículos"
                        },
                        consolidatedBilling: {
                            en: "Consolidated billing",
                            es: "Facturación consolidada"
                        },
                        priorityReplacement: {
                            en: "Priority vehicle replacement",
                            es: "Reemplazo prioritario de vehículos"
                        }
                    }
                },
                form: {
                    contactName: {
                        label: {
                            en: "Contact Name",
                            es: "Nombre del Contacto"
                        },
                        placeholder: {
                            en: "John Smith",
                            es: "Juan García"
                        }
                    },
                    workEmail: {
                        label: {
                            en: "Work Email",
                            es: "Correo de Trabajo"
                        },
                        placeholder: {
                            en: "john@company.com",
                            es: "juan@empresa.com"
                        }
                    },
                    phone: {
                        label: {
                            en: "Phone Number",
                            es: "Número de Teléfono"
                        },
                        placeholder: {
                            en: "(555) 123-4567",
                            es: "(555) 123-4567"
                        }
                    }
                },
                button: {
                    en: "Get Started →",
                    es: "Comenzar →"
                }
            }
        },
        // Disqualification Screens
        dq: {
            age: {
                title: {
                    en: "Just a bit too young",
                    es: "Solo un poco muy joven"
                },
                subtitle: {
                    en: "Our insurance requires drivers to be at least 25. But don't worry!",
                    es: "Nuestro seguro requiere que los conductores tengan al menos 25 años. ¡Pero no te preocupes!"
                },
                message: {
                    en: "Join our waitlist and we'll let you know when you're eligible. Some platforms approve drivers at 21.",
                    es: "Únete a nuestra lista de espera y te avisaremos cuando seas elegible. Algunas plataformas aprueban conductores a los 21 años."
                },
                form: {
                    name: {
                        placeholder: {
                            en: "Your name",
                            es: "Tu nombre"
                        }
                    },
                    phone: {
                        placeholder: {
                            en: "Your phone",
                            es: "Tu teléfono"
                        }
                    },
                    birthday: {
                        label: {
                            en: "Your birthday (so we know when to reach out)",
                            es: "Tu cumpleaños (para saber cuándo contactarte)"
                        }
                    }
                },
                button: {
                    en: "Join Waitlist",
                    es: "Unirse a Lista de Espera"
                }
            },
            license: {
                title: {
                    en: "Let's get you ready",
                    es: "Preparémonos"
                },
                subtitle: {
                    en: "You'll need a valid driver's license and clean background to rent with us.",
                    es: "Necesitarás una licencia de conducir válida y antecedentes limpios para rentar con nosotros."
                },
                message: {
                    en: "If your situation changes, we'd love to help you get on the road. Feel free to check back anytime.",
                    es: "Si tu situación cambia, nos encantaría ayudarte a ponerte en camino. No dudes en volver a consultar en cualquier momento."
                }
            },
            earnings: {
                title: {
                    en: "Let's talk!",
                    es: "¡Hablemos!"
                },
                subtitle: {
                    en: "Your earnings are a bit low for our standard program, but we might have options.",
                    es: "Tus ganancias son un poco bajas para nuestro programa estándar, pero podríamos tener opciones."
                },
                message: {
                    en: "Call us: We can discuss a higher deposit or other arrangements that might work for your situation.",
                    es: "Llámanos: Podemos discutir un depósito mayor u otros arreglos que podrían funcionar para tu situación."
                },
                callback: {
                    en: "Or leave your info and we'll call you:",
                    es: "O deja tu información y te llamaremos:"
                },
                button: {
                    en: "Request a Callback",
                    es: "Solicitar una Llamada"
                }
            },
            unemployed: {
                title: {
                    en: "Let's explore options",
                    es: "Exploremos opciones"
                },
                subtitle: {
                    en: "Without current income, our standard program might not be the best fit—but let's talk.",
                    es: "Sin ingresos actuales, nuestro programa estándar podría no ser la mejor opción—pero hablemos."
                },
                message: {
                    en: "Option: If you have savings or a co-signer, we might be able to work something out.",
                    es: "Opción: Si tienes ahorros o un co-firmante, podríamos llegar a un arreglo."
                }
            },
            noIncome: {
                title: {
                    en: "Starting fresh is tough",
                    es: "Empezar de nuevo es difícil"
                },
                subtitle: {
                    en: "Without income or savings, it's risky for both of us. But there might be options.",
                    es: "Sin ingresos o ahorros, es arriesgado para ambos. Pero podría haber opciones."
                },
                message: {
                    en: "Ideas: If you can get a co-signer, put down a larger deposit, or start part-time while you have another job, we can probably make it work.",
                    es: "Ideas: Si puedes conseguir un co-firmante, dar un depósito mayor, o comenzar medio tiempo mientras tienes otro trabajo, probablemente podamos hacerlo funcionar."
                },
                button: {
                    en: "Let's Talk Options",
                    es: "Hablemos de Opciones"
                },
                waitlist: {
                    en: "Or join the waitlist for when you're ready:",
                    es: "O únete a la lista de espera para cuando estés listo:"
                }
            }
        },
        footer: {
            en: "© 2025 Fleetzy. Houston, TX | (281) 271-3900",
            es: "© 2025 Fleetzy. Houston, TX | (281) 271-3900"
        },
        alerts: {
            namePhoneRequired: {
                en: "Please enter your name and phone number",
                es: "Por favor ingresa tu nombre y número de teléfono"
            },
            waitlistSuccess: {
                en: "Thanks! We'll reach out when you're eligible. 🎉",
                es: "¡Gracias! Te contactaremos cuando seas elegible. 🎉"
            },
            callbackSuccess: {
                en: "Got it! We'll call you soon. 📞",
                es: "¡Entendido! Te llamaremos pronto. 📞"
            }
        }
    },

    // ============================================
    // APPLICATION FORM
    // ============================================
    application: {
        meta: {
            title: {
                en: "Apply Now - Fleetzy Car Rental",
                es: "Solicitar Ahora - Renta de Autos Fleetzy"
            }
        },
        progress: {
            step1: {
                en: "Personal Info",
                es: "Información Personal"
            },
            step2: {
                en: "Select Vehicle",
                es: "Seleccionar Vehículo"
            },
            step3: {
                en: "Selfie",
                es: "Selfie"
            },
            step4: {
                en: "Driver's License",
                es: "Licencia de Conducir"
            },
            step5: {
                en: "Income & Review",
                es: "Ingresos y Revisión"
            },
            mobileStep: {
                en: "Step",
                es: "Paso"
            },
            of: {
                en: "of",
                es: "de"
            },
            complete: {
                en: "Complete",
                es: "Completo"
            }
        },
        trustBadges: {
            insured: {
                en: "100% Insured",
                es: "100% Asegurado"
            },
            rating: {
                en: "4.9/5 Rating",
                es: "Calificación 4.9/5"
            },
            activeDrivers: {
                en: "200+ Active Drivers",
                es: "200+ Conductores Activos"
            },
            approval: {
                en: "24hr Approval",
                es: "Aprobación en 24hrs"
            }
        },
        step1: {
            title: {
                en: "Let's get to know you",
                es: "Vamos a conocerte"
            },
            rentalType: {
                title: {
                    en: "Rental Type",
                    es: "Tipo de Renta"
                },
                personal: {
                    title: {
                        en: "Personal",
                        es: "Personal"
                    },
                    price: {
                        en: "$400/week",
                        es: "$400/semana"
                    }
                },
                company: {
                    title: {
                        en: "Company",
                        es: "Empresa"
                    },
                    price: {
                        en: "$350-375/week",
                        es: "$350-375/semana"
                    }
                }
            },
            companySection: {
                title: {
                    en: "Company Information",
                    es: "Información de la Empresa"
                },
                companyName: {
                    label: {
                        en: "Company Name",
                        es: "Nombre de la Empresa"
                    }
                },
                hrName: {
                    label: {
                        en: "HR Contact Name",
                        es: "Nombre del Contacto de RH"
                    }
                },
                hrEmail: {
                    label: {
                        en: "HR Contact Email",
                        es: "Correo del Contacto de RH"
                    }
                },
                hrPhone: {
                    label: {
                        en: "HR Contact Phone",
                        es: "Teléfono del Contacto de RH"
                    }
                },
                note: {
                    en: "Company rentals require dual signatures. HR rep signs first, driver signs after approval.",
                    es: "Las rentas de empresa requieren firmas dobles. El representante de RH firma primero, el conductor firma después de la aprobación."
                }
            },
            fields: {
                firstName: {
                    label: {
                        en: "First Name *",
                        es: "Nombre *"
                    }
                },
                lastName: {
                    label: {
                        en: "Last Name *",
                        es: "Apellido *"
                    }
                },
                email: {
                    label: {
                        en: "Email Address *",
                        es: "Correo Electrónico *"
                    }
                },
                phone: {
                    label: {
                        en: "Phone Number *",
                        es: "Número de Teléfono *"
                    },
                    placeholder: {
                        en: "(281) 555-0123",
                        es: "(281) 555-0123"
                    }
                },
                dob: {
                    label: {
                        en: "Date of Birth *",
                        es: "Fecha de Nacimiento *"
                    },
                    note: {
                        en: "Must be 18 or older to rent",
                        es: "Debes tener 18 años o más para rentar"
                    }
                },
                address: {
                    label: {
                        en: "Street Address *",
                        es: "Dirección *"
                    }
                },
                city: {
                    label: {
                        en: "City *",
                        es: "Ciudad *"
                    }
                },
                state: {
                    label: {
                        en: "State *",
                        es: "Estado *"
                    },
                    placeholder: {
                        en: "Select State",
                        es: "Seleccionar Estado"
                    }
                },
                zip: {
                    label: {
                        en: "ZIP Code *",
                        es: "Código Postal *"
                    }
                }
            }
        },
        step2: {
            title: {
                en: "Choose Your Vehicle",
                es: "Elige Tu Vehículo"
            },
            subtitle: {
                en: "Select the vehicle you'd like to rent. All vehicles are rideshare-approved.",
                es: "Selecciona el vehículo que te gustaría rentar. Todos los vehículos están aprobados para rideshare."
            },
            loading: {
                en: "Loading available vehicles...",
                es: "Cargando vehículos disponibles..."
            },
            error: {
                title: {
                    en: "Unable to load vehicles",
                    es: "No se pudieron cargar los vehículos"
                },
                message: {
                    en: "Please check your internet connection and try again.",
                    es: "Por favor verifica tu conexión a internet e intenta de nuevo."
                },
                retry: {
                    en: "Try Again",
                    es: "Intentar de Nuevo"
                }
            },
            available: {
                en: "Available",
                es: "Disponible"
            },
            unavailable: {
                en: "Not Available",
                es: "No Disponible"
            },
            selected: {
                en: "Selected",
                es: "Seleccionado"
            },
            perWeek: {
                en: "/week",
                es: "/semana"
            }
        },
        step3: {
            title: {
                en: "Take a Selfie",
                es: "Toma una Selfie"
            },
            subtitle: {
                en: "We need a clear photo of your face for identity verification.",
                es: "Necesitamos una foto clara de tu rostro para verificación de identidad."
            },
            instructions: {
                en: "Position your face in the circle",
                es: "Posiciona tu rostro en el círculo"
            },
            tips: {
                title: {
                    en: "Tips for a good selfie:",
                    es: "Consejos para una buena selfie:"
                },
                lighting: {
                    en: "Good lighting on your face",
                    es: "Buena iluminación en tu rostro"
                },
                noSunglasses: {
                    en: "Remove sunglasses and hats",
                    es: "Quítate las gafas de sol y sombreros"
                },
                faceCamera: {
                    en: "Face the camera directly",
                    es: "Mira directamente a la cámara"
                }
            },
            buttons: {
                takePhoto: {
                    en: "Take Photo",
                    es: "Tomar Foto"
                },
                capture: {
                    en: "Capture",
                    es: "Capturar"
                },
                retake: {
                    en: "Retake",
                    es: "Volver a Tomar"
                },
                upload: {
                    en: "Or upload a photo",
                    es: "O sube una foto"
                }
            },
            success: {
                en: "Selfie captured successfully!",
                es: "¡Selfie capturada exitosamente!"
            }
        },
        step4: {
            title: {
                en: "Driver's License",
                es: "Licencia de Conducir"
            },
            subtitle: {
                en: "Upload photos of your driver's license and enter the details.",
                es: "Sube fotos de tu licencia de conducir e ingresa los detalles."
            },
            front: {
                label: {
                    en: "Front of License *",
                    es: "Frente de la Licencia *"
                },
                instruction: {
                    en: "Click to upload or drag and drop",
                    es: "Haz clic para subir o arrastra y suelta"
                }
            },
            back: {
                label: {
                    en: "Back of License *",
                    es: "Reverso de la Licencia *"
                },
                instruction: {
                    en: "Click to upload or drag and drop",
                    es: "Haz clic para subir o arrastra y suelta"
                }
            },
            fields: {
                number: {
                    label: {
                        en: "License Number *",
                        es: "Número de Licencia *"
                    }
                },
                state: {
                    label: {
                        en: "Issuing State *",
                        es: "Estado Emisor *"
                    },
                    placeholder: {
                        en: "Select State",
                        es: "Seleccionar Estado"
                    }
                },
                expiry: {
                    label: {
                        en: "Expiration Date *",
                        es: "Fecha de Expiración *"
                    }
                }
            }
        },
        step5: {
            title: {
                en: "Income Verification & Review",
                es: "Verificación de Ingresos y Revisión"
            },
            subtitle: {
                en: "Almost done! Just verify your income and review your application.",
                es: "¡Casi terminamos! Solo verifica tus ingresos y revisa tu solicitud."
            },
            incomeSource: {
                label: {
                    en: "Primary Income Source *",
                    es: "Fuente Principal de Ingresos *"
                },
                placeholder: {
                    en: "Select income source",
                    es: "Seleccionar fuente de ingresos"
                },
                options: {
                    uber: { en: "Uber", es: "Uber" },
                    lyft: { en: "Lyft", es: "Lyft" },
                    doordash: { en: "DoorDash", es: "DoorDash" },
                    instacart: { en: "Instacart", es: "Instacart" },
                    amazonFlex: { en: "Amazon Flex", es: "Amazon Flex" },
                    employed: { en: "Employed (W-2)", es: "Empleado (W-2)" },
                    selfEmployed: { en: "Self-Employed", es: "Trabajador Independiente" },
                    other: { en: "Other", es: "Otro" }
                }
            },
            incomeProof: {
                label: {
                    en: "Proof of Income *",
                    es: "Comprobante de Ingresos *"
                },
                instruction: {
                    en: "Upload bank statement, pay stub, or earnings screenshot",
                    es: "Sube estado de cuenta bancario, talón de pago, o captura de ganancias"
                },
                note: {
                    en: "Accepted: Bank statements, pay stubs, rideshare earnings screenshots",
                    es: "Aceptado: Estados de cuenta bancarios, talones de pago, capturas de ganancias de rideshare"
                }
            },
            terms: {
                checkbox: {
                    en: "I agree to the",
                    es: "Acepto los"
                },
                link: {
                    en: "rental terms and conditions",
                    es: "términos y condiciones de renta"
                },
                required: {
                    en: "*",
                    es: "*"
                }
            },
            summary: {
                title: {
                    en: "Application Summary",
                    es: "Resumen de Solicitud"
                },
                name: {
                    en: "Name:",
                    es: "Nombre:"
                },
                email: {
                    en: "Email:",
                    es: "Correo:"
                },
                phone: {
                    en: "Phone:",
                    es: "Teléfono:"
                },
                vehicle: {
                    en: "Vehicle:",
                    es: "Vehículo:"
                },
                type: {
                    en: "Type:",
                    es: "Tipo:"
                },
                personal: {
                    en: "Personal Rental",
                    es: "Renta Personal"
                },
                corporate: {
                    en: "Corporate Rental",
                    es: "Renta Corporativa"
                }
            },
            submit: {
                en: "Submit Application",
                es: "Enviar Solicitud"
            },
            submitting: {
                en: "Submitting...",
                es: "Enviando..."
            }
        },
        validation: {
            fillRequired: {
                en: "Please fill in all required fields",
                es: "Por favor completa todos los campos requeridos"
            },
            validEmail: {
                en: "Please enter a valid email address",
                es: "Por favor ingresa un correo electrónico válido"
            },
            selectVehicle: {
                en: "Please select a vehicle",
                es: "Por favor selecciona un vehículo"
            },
            selectVehicleDetail: {
                en: "Click on any available vehicle above to continue.",
                es: "Haz clic en cualquier vehículo disponible arriba para continuar."
            },
            takeSelfie: {
                en: "Please take or upload a selfie photo",
                es: "Por favor toma o sube una foto selfie"
            },
            uploadFront: {
                en: "Please upload the front of your driver's license",
                es: "Por favor sube el frente de tu licencia de conducir"
            },
            uploadBack: {
                en: "Please upload the back of your driver's license",
                es: "Por favor sube el reverso de tu licencia de conducir"
            },
            enterLicense: {
                en: "Please enter your driver's license number",
                es: "Por favor ingresa tu número de licencia de conducir"
            },
            selectLicenseState: {
                en: "Please select the state that issued your driver's license",
                es: "Por favor selecciona el estado que emitió tu licencia de conducir"
            },
            enterExpiry: {
                en: "Please enter your license expiration date",
                es: "Por favor ingresa la fecha de expiración de tu licencia"
            },
            licenseExpired: {
                en: "Your driver's license appears to be expired. Please contact us if this is incorrect.",
                es: "Tu licencia de conducir parece estar vencida. Por favor contáctanos si esto es incorrecto."
            },
            selectIncome: {
                en: "Please select your income source",
                es: "Por favor selecciona tu fuente de ingresos"
            },
            uploadIncome: {
                en: "Please upload proof of income (bank statement, pay stub, or earnings screenshot)",
                es: "Por favor sube comprobante de ingresos (estado de cuenta bancario, talón de pago, o captura de ganancias)"
            },
            agreeTerms: {
                en: "Please agree to the rental terms and conditions",
                es: "Por favor acepta los términos y condiciones de renta"
            },
            cameraError: {
                en: "Unable to access camera. Please upload a photo instead.",
                es: "No se pudo acceder a la cámara. Por favor sube una foto en su lugar."
            },
            fileTooLarge: {
                en: "File is too large. Please choose an image under 10MB.",
                es: "El archivo es muy grande. Por favor elige una imagen menor a 10MB."
            }
        }
    },

    // ============================================
    // APPLICATION SUCCESS PAGE
    // ============================================
    applicationSuccess: {
        meta: {
            title: {
                en: "Application Submitted - Fleetzy",
                es: "Solicitud Enviada - Fleetzy"
            }
        },
        title: {
            en: "Application Submitted! 🎉",
            es: "¡Solicitud Enviada! 🎉"
        },
        subtitle: {
            en: "Thank you for applying to Fleetzy. We've received your application and our team is reviewing it now.",
            es: "Gracias por solicitar con Fleetzy. Hemos recibido tu solicitud y nuestro equipo la está revisando ahora."
        },
        nextSteps: {
            title: {
                en: "What happens next?",
                es: "¿Qué sigue?"
            },
            step1: {
                title: {
                    en: "Review",
                    es: "Revisión"
                },
                description: {
                    en: "We'll review your application within 24 hours",
                    es: "Revisaremos tu solicitud en 24 horas"
                }
            },
            step2: {
                title: {
                    en: "Verification",
                    es: "Verificación"
                },
                description: {
                    en: "We'll verify your driver's license and background",
                    es: "Verificaremos tu licencia de conducir y antecedentes"
                }
            },
            step3: {
                title: {
                    en: "Approval",
                    es: "Aprobación"
                },
                description: {
                    en: "You'll receive a call or text with your approval status",
                    es: "Recibirás una llamada o mensaje con tu estado de aprobación"
                }
            },
            step4: {
                title: {
                    en: "Pickup",
                    es: "Recogida"
                },
                description: {
                    en: "Schedule your vehicle pickup and hit the road!",
                    es: "¡Programa la recogida de tu vehículo y ponte en camino!"
                }
            }
        },
        applicationDetails: {
            title: {
                en: "Your Application Details",
                es: "Detalles de Tu Solicitud"
            },
            name: {
                en: "Name:",
                es: "Nombre:"
            },
            phone: {
                en: "Phone:",
                es: "Teléfono:"
            },
            email: {
                en: "Email:",
                es: "Correo:"
            },
            type: {
                en: "Type:",
                es: "Tipo:"
            },
            personalRental: {
                en: "Personal Rental",
                es: "Renta Personal"
            },
            corporateRental: {
                en: "Corporate Rental",
                es: "Renta Corporativa"
            }
        },
        contact: {
            title: {
                en: "Have questions? We're here to help!",
                es: "¿Tienes preguntas? ¡Estamos aquí para ayudar!"
            },
            call: {
                en: "Call (281) 271-3900",
                es: "Llamar (281) 271-3900"
            },
            backToHome: {
                en: "Back to Home",
                es: "Volver al Inicio"
            }
        },
        socialProof: {
            en: "Trusted by Houston's rideshare drivers",
            es: "De confianza para los conductores de rideshare de Houston"
        },
        footer: {
            copyright: {
                en: "© 2025 Fleetzy. All rights reserved.",
                es: "© 2025 Fleetzy. Todos los derechos reservados."
            },
            location: {
                en: "Houston, Texas",
                es: "Houston, Texas"
            }
        }
    },

    // ============================================
    // SMS MESSAGES (for n8n workflows)
    // ============================================
    sms: {
        paymentReminder: {
            en: "Hi {{name}}! Your Fleetzy weekly payment of ${{amount}} is due in 2 days ({{dueDate}}). Pay on time to keep your good standing! Questions? Call (281) 271-3900",
            es: "¡Hola {{name}}! Tu pago semanal de Fleetzy de ${{amount}} vence en 2 días ({{dueDate}}). ¡Paga a tiempo para mantener tu buen historial! ¿Preguntas? Llama al (281) 271-3900"
        },
        latePaymentCustomer: {
            en: "Hi {{name}}, your Fleetzy payment of ${{amount}} was due on {{dueDate}} and is now {{daysLate}} days late. Please pay immediately to avoid late fees. Call (281) 271-3900 if you need help.",
            es: "Hola {{name}}, tu pago de Fleetzy de ${{amount}} venció el {{dueDate}} y tiene {{daysLate}} días de retraso. Por favor paga inmediatamente para evitar cargos por mora. Llama al (281) 271-3900 si necesitas ayuda."
        },
        latePaymentOwner: {
            en: "LATE PAYMENT ALERT: {{customerName}} ({{phone}}) is {{daysLate}} days late on ${{amount}}. Vehicle: {{vehicle}}. Total outstanding: ${{totalOwed}}",
            es: "ALERTA DE PAGO ATRASADO: {{customerName}} ({{phone}}) tiene {{daysLate}} días de retraso en ${{amount}}. Vehículo: {{vehicle}}. Total pendiente: ${{totalOwed}}"
        },
        paymentConfirmation: {
            en: "Thanks {{name}}! We received your ${{amount}} payment for Fleetzy. Next payment due: {{nextDueDate}}. Receipt #{{receiptId}}. Questions? (281) 271-3900",
            es: "¡Gracias {{name}}! Recibimos tu pago de ${{amount}} para Fleetzy. Próximo pago: {{nextDueDate}}. Recibo #{{receiptId}}. ¿Preguntas? (281) 271-3900"
        },
        maintenanceAlert: {
            en: "🔧 MAINTENANCE ALERT for {{vehicleName}} ({{licensePlate}}): {{maintenanceType}} is {{status}}. {{reason}}. Schedule service to avoid downtime!",
            es: "🔧 ALERTA DE MANTENIMIENTO para {{vehicleName}} ({{licensePlate}}): {{maintenanceType}} está {{status}}. {{reason}}. ¡Programa servicio para evitar tiempo de inactividad!"
        }
    }
};

// ============================================
// TRANSLATION HELPER FUNCTIONS
// ============================================

/**
 * Get current language from localStorage or default to 'en'
 */
function getCurrentLanguage() {
    return localStorage.getItem('fleetzy_language') || 'en';
}

/**
 * Set current language and save to localStorage
 */
function setCurrentLanguage(lang) {
    localStorage.setItem('fleetzy_language', lang);
    document.documentElement.lang = lang;
    return lang;
}

/**
 * Get translation by dot-notation key path
 * @param {string} key - Dot notation path like 'common.buttons.applyNow'
 * @param {object} vars - Optional variables for substitution {{var}}
 * @returns {string} Translated string or key if not found
 */
function t(key, vars = {}) {
    const lang = getCurrentLanguage();
    const keys = key.split('.');
    let value = TRANSLATIONS;
    
    // Navigate through nested object
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            console.warn(`Translation not found: ${key}`);
            return key; // Return key as fallback
        }
    }
    
    // Get language-specific value
    if (value && typeof value === 'object' && lang in value) {
        let text = value[lang];
        
        // Replace variables {{varName}}
        for (const [varName, varValue] of Object.entries(vars)) {
            text = text.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), varValue);
        }
        
        return text;
    }
    
    // Fallback to English
    if (value && typeof value === 'object' && 'en' in value) {
        let text = value['en'];
        for (const [varName, varValue] of Object.entries(vars)) {
            text = text.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), varValue);
        }
        return text;
    }
    
    console.warn(`Translation not found: ${key}`);
    return key;
}

/**
 * Get all translations for a section
 * @param {string} section - Section key like 'qualify.entry'
 * @returns {object} All translations in that section
 */
function getSection(section) {
    const keys = section.split('.');
    let value = TRANSLATIONS;
    
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return {};
        }
    }
    
    return value;
}

// Make functions globally available
window.TRANSLATIONS = TRANSLATIONS;
window.t = t;
window.getCurrentLanguage = getCurrentLanguage;
window.setCurrentLanguage = setCurrentLanguage;
window.getSection = getSection;

// ==========================================
// APPLICATION FORM TRANSLATIONS
// ==========================================
window.FleetzyTranslations.en.application = {
    pageTitle: "Apply Now - Fleetzy Car Rental",
    header: {
        needHelp: "Need help?",
        phone: "(281) 271-3900"
    },
    progress: {
        step: "Step",
        of: "of",
        complete: "Complete",
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
            firstName: "First Name",
            lastName: "Last Name",
            email: "Email Address",
            phone: "Phone Number",
            phonePlaceholder: "(281) 555-0123",
            dateOfBirth: "Date of Birth",
            dobNote: "Must be 18 or older to rent",
            address: "Street Address",
            city: "City",
            state: "State",
            selectState: "Select State",
            zipCode: "ZIP Code"
        }
    },
    step2: {
        title: "Choose Your Vehicle",
        subtitle: "Select from our available rideshare-approved vehicles",
        loading: "Loading vehicles...",
        perWeek: "/week",
        available: "Available",
        unavailable: "Unavailable",
        selectVehicle: "Please select a vehicle to continue"
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
        licenseFront: "License Front",
        licenseBack: "License Back",
        clickUploadFront: "Click to upload front of license",
        clickUploadBack: "Click to upload back of license",
        fileType: "PNG, JPG up to 10MB",
        licenseNumber: "License Number",
        licenseState: "License State",
        expirationDate: "Expiration Date"
    },
    step5: {
        title: "Income Verification",
        subtitle: "Final step - upload proof of income and review your application",
        incomeSource: {
            label: "Income Source",
            select: "Select Income Source",
            uber: "Uber Driver",
            lyft: "Lyft Driver",
            doordash: "DoorDash Driver",
            w2: "W-2 Employee",
            selfEmployed: "Self-Employed",
            other: "Other"
        },
        incomeProof: {
            label: "Proof of Income",
            upload: "Upload bank statement, pay stub, or earnings report",
            fileType: "PDF, PNG, JPG up to 10MB"
        },
        terms: "I agree to the rental terms and conditions. I understand that a $250 refundable security deposit is required and will be returned at the end of the rental period (minus any damages). Weekly payments of $400 are due every 7 days. I authorize Fleetzy to run a background check.",
        summary: {
            title: "Application Summary",
            weeklyRate: "Weekly Rate",
            deposit: "Refundable Deposit",
            dueToday: "Due Today",
            approvalTime: "Approval Time",
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
};

window.FleetzyTranslations.es.application = {
    pageTitle: "Solicitar Ahora - Fleetzy Renta de Autos",
    header: {
        needHelp: "¿Necesita ayuda?",
        phone: "(281) 271-3900"
    },
    progress: {
        step: "Paso",
        of: "de",
        complete: "Completo",
        steps: {
            personal: "Información Personal",
            vehicle: "Seleccionar Vehículo",
            selfie: "Selfie",
            license: "Licencia de Conducir",
            income: "Ingresos y Revisión"
        }
    },
    trustBadges: {
        insured: "100% Asegurado",
        rating: "4.9/5 Calificación",
        drivers: "200+ Conductores Activos",
        approval: "Aprobación en 24hrs"
    },
    step1: {
        title: "Información Personal",
        subtitle: "Cuéntenos sobre usted para comenzar",
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
            hrContactName: "Nombre del Contacto de RH",
            hrContactEmail: "Email del Contacto de RH",
            hrContactPhone: "Teléfono del Contacto de RH",
            note: "Las rentas empresariales requieren firmas dobles. El representante de RH firma primero, el conductor firma después de la aprobación."
        },
        fields: {
            firstName: "Nombre",
            lastName: "Apellido",
            email: "Correo Electrónico",
            phone: "Número de Teléfono",
            phonePlaceholder: "(281) 555-0123",
            dateOfBirth: "Fecha de Nacimiento",
            dobNote: "Debe tener 18 años o más para rentar",
            address: "Dirección",
            city: "Ciudad",
            state: "Estado",
            selectState: "Seleccionar Estado",
            zipCode: "Código Postal"
        }
    },
    step2: {
        title: "Elija Su Vehículo",
        subtitle: "Seleccione de nuestros vehículos disponibles aprobados para rideshare",
        loading: "Cargando vehículos...",
        perWeek: "/semana",
        available: "Disponible",
        unavailable: "No Disponible",
        selectVehicle: "Por favor seleccione un vehículo para continuar"
    },
    step3: {
        title: "Tome Su Selfie",
        subtitle: "Necesitamos una foto clara de su rostro para verificación de identidad",
        startCamera: "Iniciar Cámara",
        uploadGallery: "Subir de Galería",
        cameraInstruction: "Posicione su rostro en el círculo",
        capturePhoto: "Capturar Foto",
        cancel: "Cancelar",
        preview: "Vista previa:",
        retake: "Volver a tomar",
        tips: {
            title: "Consejos para Selfie",
            lighting: "Asegure buena iluminación en su rostro",
            sunglasses: "Quítese los lentes de sol y sombrero",
            lookCamera: "Mire directamente a la cámara",
            faceVisible: "Asegúrese de que todo su rostro sea visible"
        }
    },
    step4: {
        title: "Licencia de Conducir",
        subtitle: "Suba ambos lados de su licencia de conducir válida",
        licenseFront: "Frente de la Licencia",
        licenseBack: "Reverso de la Licencia",
        clickUploadFront: "Clic para subir el frente de la licencia",
        clickUploadBack: "Clic para subir el reverso de la licencia",
        fileType: "PNG, JPG hasta 10MB",
        licenseNumber: "Número de Licencia",
        licenseState: "Estado de la Licencia",
        expirationDate: "Fecha de Vencimiento"
    },
    step5: {
        title: "Verificación de Ingresos",
        subtitle: "Último paso - suba comprobante de ingresos y revise su solicitud",
        incomeSource: {
            label: "Fuente de Ingresos",
            select: "Seleccionar Fuente de Ingresos",
            uber: "Conductor de Uber",
            lyft: "Conductor de Lyft",
            doordash: "Conductor de DoorDash",
            w2: "Empleado W-2",
            selfEmployed: "Autoempleado",
            other: "Otro"
        },
        incomeProof: {
            label: "Comprobante de Ingresos",
            upload: "Suba estado de cuenta bancario, talón de pago o reporte de ganancias",
            fileType: "PDF, PNG, JPG hasta 10MB"
        },
        terms: "Acepto los términos y condiciones de la renta. Entiendo que se requiere un depósito de seguridad reembolsable de $250 que será devuelto al final del período de renta (menos cualquier daño). Los pagos semanales de $400 vencen cada 7 días. Autorizo a Fleetzy a realizar una verificación de antecedentes.",
        summary: {
            title: "Resumen de Solicitud",
            weeklyRate: "Tarifa Semanal",
            deposit: "Depósito Reembolsable",
            dueToday: "A Pagar Hoy",
            approvalTime: "Tiempo de Aprobación",
            hours: "24 horas"
        }
    },
    buttons: {
        next: "Siguiente Paso",
        back: "Atrás",
        submit: "Enviar Solicitud"
    },
    footer: {
        copyright: "© 2025 Fleetzy. Todos los derechos reservados.",
        questions: "¿Preguntas? Llámenos al"
    }
};
