const axios = require('axios');
const NodeCache = require('node-cache');
const { publishEvent } = require('../utils/rabbitmq');

/**
 * Servicio de pacientes para el BFF
 * @class PatientService
 * @description Gestiona la comunicación con el patients-service y agregación de datos
 */

// Configuración de caché
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 300, // 5 minutos
  checkperiod: 60, // Limpiar cada minuto
  useClones: false
});

// Configuración de Axios para el patients-service
const patientApiClient = axios.create({
  baseURL: process.env.PATIENTS_SERVICE_URL || 'http://localhost:3003',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Obtiene pacientes del usuario autenticado con agregación de datos
 * @param {string} token - Token de acceso JWT
 * @param {Object} options - Opciones de búsqueda
 * @param {number} options.page - Página
 * @param {number} options.limit - Límite de resultados
 * @param {string} options.search - Término de búsqueda
 * @returns {Promise<Object>} Pacientes con datos agregados
 * @throws {Error} Si el token es inválido
 * @example
 * const patients = await PatientService.getMyPatients('token_here', {
 *   page: 1,
 *   limit: 20,
 *   search: 'firulais'
 * });
 */
const getMyPatients = async (token, options = {}) => {
  try {
    const { page = 1, limit = 20, search } = options;
    
    // Verificar caché primero
    const cacheKey = `my_patients:${page}:${limit}:${search || 'all'}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      // Publicar evento de cache hit
      await publishEvent('cache.hit', {
        type: 'my_patients',
        page,
        limit,
        search,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Pacientes obtenidos desde caché',
        data: cachedData
      };
    }

    // Obtener datos del usuario del token
    const tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    // Construir URL con parámetros
    let url = '/api/patients';
    const params = new URLSearchParams();
    
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (search) params.append('search', search);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // Llamar al patients-service
    const response = await patientApiClient.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    let patients = response.data.data.patients;

    // Filtrar pacientes del usuario si es cliente
    if (tokenPayload.role === 'client') {
      patients = patients.filter(patient => 
        patient.tutorEmail === tokenPayload.email
      );
    }

    // Agregar datos adicionales y transformar para el frontend
    const transformedPatients = patients.map(patient => ({
      id: patient.id,
      name: patient.name,
      nickname: patient.nickname,
      species: patient.speciesName,
      breed: patient.breedName,
      gender: patient.gender,
      weight: patient.weight,
      birthDate: patient.birthDate,
      age: calculateAge(patient.birthDate),
      microchipNumber: patient.microchipNumber,
      lastVisit: patient.lastVisit || null,
      nextAppointment: patient.nextAppointment || null,
      vaccinationsStatus: getVaccinationStatus(patient.vaccinations),
      isActive: patient.isActive,
      createdAt: patient.createdAt,
      // Datos del tutor
      tutor: {
        id: patient.tutorId,
        firstName: patient.tutorFirstName,
        lastName: patient.tutorLastName,
        email: patient.tutorEmail,
        phone: patient.tutorPhone
      }
    }));

    const result = {
      patients: transformedPatients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transformedPatients.length,
        totalPages: Math.ceil(transformedPatients.length / limit)
      }
    };

    // Cachear resultado
    cache.set(cacheKey, result);

    // Publicar evento de cache miss
    await publishEvent('cache.miss', {
      type: 'my_patients',
      page,
      limit,
      search,
      timestamp: new Date().toISOString()
    });

    // Publicar evento de agregación de datos
    await publishEvent('data.aggregated', {
      type: 'my_patients',
      userId: tokenPayload.id,
      count: transformedPatients.length,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Pacientes obtenidos exitosamente',
      data: result
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene detalles completos de un paciente con historial clínico
 * @param {string} token - Token de acceso JWT
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Object>} Datos completos del paciente
 * @throws {Error} Si el paciente no existe o no tiene permisos
 * @example
 * const patient = await PatientService.getPatientDetails('token_here', 123);
 */
const getPatientDetails = async (token, patientId) => {
  try {
    // Verificar caché primero
    const cacheKey = `patient_details:${patientId}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      // Publicar evento de cache hit
      await publishEvent('cache.hit', {
        type: 'patient_details',
        patientId,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Detalles del paciente obtenidos desde caché',
        data: cachedData
      };
    }

    // Obtener datos del paciente
    const patientResponse = await patientApiClient.get(`/api/patients/${patientId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const patient = patientResponse.data.data.patient;

    // Obtener historial clínico reciente
    const historyResponse = await patientApiClient.get(`/api/patients/${patientId}/history?limit=10`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const history = historyResponse.data.data.history;

    // Obtener vacunaciones
    const vaccinationsResponse = await patientApiClient.get(`/api/patients/${patientId}/vaccinations`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const vaccinations = vaccinationsResponse.data.data.vaccinations;

    // Obtener alergias
    const allergiesResponse = await patientApiClient.get(`/api/patients/${patientId}/allergies`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const allergies = allergiesResponse.data.data.allergies;

    // Agregar y transformar datos
    const aggregatedData = {
      // Información básica
      id: patient.id,
      name: patient.name,
      nickname: patient.nickname,
      species: {
        id: patient.speciesId,
        name: patient.speciesName
      },
      breed: {
        id: patient.breedId,
        name: patient.breedName
      },
      gender: patient.gender,
      weight: patient.weight,
      birthDate: patient.birthDate,
      age: calculateAge(patient.birthDate),
      color: patient.color,
      microchipNumber: patient.microchipNumber,
      specialMarks: patient.specialMarks,
      
      // Información médica
      allergies: patient.allergies,
      chronicDiseases: patient.chronicDiseases,
      currentMedications: patient.currentMedications,
      dietaryRestrictions: patient.dietaryRestrictions,
      behaviorNotes: patient.behaviorNotes,
      
      // Datos del tutor
      tutor: {
        id: patient.tutorId,
        firstName: patient.tutorFirstName,
        lastName: patient.tutorLastName,
        email: patient.tutorEmail,
        phone: patient.tutorPhone,
        address: patient.tutorAddress
      },
      
      // Historial clínico
      recentHistory: history.map(h => ({
        id: h.id,
        consultationType: h.consultationType,
        chiefComplaint: h.chiefComplaint,
        diagnosis: h.diagnosis,
        treatment: h.treatment,
        veterinarian: {
          firstName: h.veterinarianFirstName,
          lastName: h.veterinarianLastName
        },
        date: h.createdAt,
        isEmergency: h.isEmergency,
        followUpRequired: h.followUpRequired,
        followUpDate: h.followUpDate ? new Date(Date.now() + h.followUpDays * 24 * 60 * 60 * 1000) : null
      })),
      
      // Vacunaciones
      vaccinations: vaccinations.map(v => ({
        id: v.id,
        vaccineName: v.vaccineName,
        vaccineType: v.vaccineType,
        applicationDate: v.applicationDate,
        nextApplicationDate: v.nextApplicationDate,
        doseNumber: v.doseNumber,
        totalDoses: v.totalDoses,
        veterinarian: {
          firstName: v.veterinarianFirstName,
          lastName: v.veterinarianLastName
        },
        status: getVaccinationStatus([v])
      })),
      
      // Alergias
      allergies: allergies.map(a => ({
        id: a.id,
        allergen: a.allergen,
        allergyType: a.allergyType,
        severity: a.severity,
        symptoms: a.symptoms,
        treatment: a.treatment,
        veterinarian: {
          firstName: a.veterinarianFirstName,
          lastName: a.veterinarianLastName
        }
      })),
      
      // Estado y fechas
      isActive: patient.isActive,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      
      // Métricas calculadas
      metrics: {
        age: calculateAge(patient.birthDate),
        totalVisits: history.length,
        emergencyVisits: history.filter(h => h.isEmergency).length,
        vaccinationsCompleted: vaccinations.filter(v => v.doseNumber === v.totalDoses).length,
        severeAllergies: allergies.filter(a => a.severity === 'severe' || a.severity === 'life_threatening').length,
        nextVaccination: getNextVaccinationDate(vaccinations),
        lastVisit: history.length > 0 ? history[0].createdAt : null
      }
    };

    // Cachear resultado
    cache.set(cacheKey, aggregatedData);

    // Publicar evento de cache miss
    await publishEvent('cache.miss', {
      type: 'patient_details',
      patientId,
      timestamp: new Date().toISOString()
    });

    // Publicar evento de vista de paciente
    await publishEvent('patient.viewed', {
      patientId,
      timestamp: new Date().toISOString()
    });

    // Publicar evento de agregación de datos
    await publishEvent('data.aggregated', {
      type: 'patient_details',
      patientId,
      includes: ['basic_info', 'history', 'vaccinations', 'allergies', 'metrics'],
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Detalles del paciente obtenidos exitosamente',
      data: aggregatedData
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Busca pacientes con filtros avanzados
 * @param {string} token - Token de acceso JWT
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Object>} Resultados de búsqueda
 * @throws {Error} Si hay error en la búsqueda
 * @example
 * const results = await PatientService.searchPatients('token_here', {
 *   name: 'firulais',
 *   species: 'perro',
 *   breed: 'labrador'
 * });
 */
const searchPatients = async (token, filters = {}) => {
  try {
    const { name, species, breed, microchip, tutorName, page = 1, limit = 20 } = filters;
    
    // Construir query string
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (species) params.append('species', species);
    if (breed) params.append('breed', breed);
    if (microchip) params.append('microchip', microchip);
    if (tutorName) params.append('tutorName', tutorName);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);

    let url = '/api/patients/search';
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await patientApiClient.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const patients = response.data.data.patients;

    // Publicar evento de búsqueda
    await publishEvent('patient.searched', {
      filters,
      resultCount: patients.length,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Búsqueda completada exitosamente',
      data: {
        patients,
        pagination: response.data.data.pagination
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene estadísticas de pacientes para el dashboard
 * @param {string} token - Token de acceso JWT
 * @returns {Promise<Object>} Estadísticas de pacientes
 * @throws {Error} Si hay error al obtener estadísticas
 * @example
 * const stats = await PatientService.getStats('token_here');
 */
const getStats = async (token) => {
  try {
    // Verificar caché primero
    const cacheKey = 'patient_stats_dashboard';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return {
        success: true,
        message: 'Estadísticas obtenidas desde caché',
        data: cachedData
      };
    }

    const response = await patientApiClient.get('/api/patients/stats', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const stats = response.data.data.stats;

    // Agregar métricas calculadas para el dashboard
    const dashboardStats = {
      ...stats,
      // Métricas adicionales
      recentGrowth: calculateGrowthRate(stats.patients.newThisMonth, stats.patients.newLastMonth),
      vaccinationCompliance: calculateVaccinationCompliance(stats.vaccinations),
      averageAge: calculateAverageAge(stats.patients.ageDistribution),
      emergencyRate: calculateEmergencyRate(stats.clinicalHistory)
    };

    // Cachear por 10 minutos (las estadísticas cambian menos frecuentemente)
    cache.set(cacheKey, dashboardStats, 600);

    return {
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: dashboardStats
    };
  } catch (error) {
    throw error;
  }
};

// Funciones auxiliares
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  const today = new Date();
  
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  
  return { years, months };
};

const getVaccinationStatus = (vaccinations) => {
  if (!vaccinations || vaccinations.length === 0) return 'not_vaccinated';
  
  const latestVaccination = vaccinations[0];
  if (latestVaccination.nextApplicationDate && new Date(latestVaccination.nextApplicationDate) > new Date()) {
    return 'up_to_date';
  }
  
  return 'overdue';
};

const getNextVaccinationDate = (vaccinations) => {
  if (!vaccinations || vaccinations.length === 0) return null;
  
  const futureDates = vaccinations
    .filter(v => v.nextApplicationDate && new Date(v.nextApplicationDate) > new Date())
    .map(v => new Date(v.nextApplicationDate))
    .sort((a, b) => a - b);
  
  return futureDates.length > 0 ? futureDates[0] : null;
};

const calculateGrowthRate = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const calculateVaccinationCompliance = (vaccinationStats) => {
  if (!vaccinationStats.total || vaccinationStats.total === 0) return 0;
  return (vaccinationStats.upToDate / vaccinationStats.total) * 100;
};

const calculateAverageAge = (ageDistribution) => {
  if (!ageDistribution || Object.keys(ageDistribution).length === 0) return 0;
  
  let totalAge = 0;
  let totalCount = 0;
  
  Object.entries(ageDistribution).forEach(([age, count]) => {
    totalAge += parseInt(age) * count;
    totalCount += count;
  });
  
  return totalCount > 0 ? totalAge / totalCount : 0;
};

const calculateEmergencyRate = (clinicalHistoryStats) => {
  if (!clinicalHistoryStats.total || clinicalHistoryStats.total === 0) return 0;
  return (clinicalHistoryStats.emergencies / clinicalHistoryStats.total) * 100;
};

module.exports = {
  getMyPatients,
  getPatientDetails,
  searchPatients,
  getStats
};
