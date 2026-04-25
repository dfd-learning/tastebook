import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Clock, Users, ChefHat, Calendar, ArrowLeft, Camera, User, Share2, Edit, Bookmark } from 'lucide-react';
import CommentSection from '../recipe-comments-subcomponents/CommentSection';
import { LikeButton } from '../recipe-subcomponents/LikeButton';
import AddToCollectionModal from '../recipe-subcomponents/AddToCollectionModal';
import PrivateRecipeNotice from '../recipe-subcomponents/PrivateRecipeNotice';
import './Recipe.scss';

export const Recipe = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPrivateRecipe, setIsPrivateRecipe] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [currentUser, setCurrentUser] = useState(null);
    const [showCollectionModal, setShowCollectionModal] = useState(false);

    const token = localStorage.getItem('token');

    useEffect(() => {
        const initializeComponent = async () => {
            const user = await fetchCurrentUser();
            await fetchRecipe(user);
        };
        initializeComponent();
    }, [id]);

    useEffect(() => {
        // Update page title when recipe loads
        if (recipe) {
            document.title = `${recipe.title} - TasteBook Recipe`;
        }
        return () => {
            document.title = 'TasteBook';
        };
    }, [recipe]);

    const handleShare = async () => {
        const shareData = {
            title: recipe.title,
            text: recipe.description || `Check out this delicious recipe: ${recipe.title}`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(window.location.href);
                alert('Recipe link copied to clipboard!');
            }
        } catch (error) {
            console.log('Error sharing:', error);
            // Fallback: copy to clipboard
            try {
                await navigator.clipboard.writeText(window.location.href);
                alert('Recipe link copied to clipboard!');
            } catch (clipboardError) {
                console.log('Error copying to clipboard:', clipboardError);
            }
        }
    };

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

            const response = await fetch(`${backendUrl}/api/settings`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentUser(data.current_user);
                return data.current_user;
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
        return null;
    };

    const fetchRecipe = async (user = null) => {
        try {
            setLoading(true);
            setError(null);
            setIsPrivateRecipe(false);

            // Validate recipe ID
            if (!id || isNaN(parseInt(id))) {
                throw new Error('Invalid recipe ID');
            }

            // Ensure we have a backend URL
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

            const apiUrl = `${backendUrl}/api/recipe/${id}`;

            console.log('Fetching recipe from:', apiUrl); // Debug log

            const headers = {
                'Content-Type': 'application/json',
            };

            // Include authorization header if user is logged in
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Recipe data received:', data); // Debug log

                if (data.recipe) {
                    // Use the passed user parameter or the state currentUser
                    const currentUserData = user || currentUser;

                    // Check if recipe is private and user is not the owner
                    if (!data.recipe.is_public && (!currentUserData || currentUserData.user_id !== data.recipe.author?.user_id)) {
                        setIsPrivateRecipe(true);
                        setLoading(false);
                        return;
                    }

                    setRecipe(data.recipe);
                } else {
                    throw new Error('Recipe data is missing from response');
                }

                // Set primary image as selected, or first image if no primary
                if (data.recipe.images && data.recipe.images.length > 0) {
                    const primaryIndex = data.recipe.images.findIndex(img => img.is_primary);
                    setSelectedImageIndex(primaryIndex !== -1 ? primaryIndex : 0);
                } else {
                    setSelectedImageIndex(0);
                }
            } else if (response.status === 404) {
                setError('Recipe not found');
            } else if (response.status === 403) {
                // Check if it's a private recipe
                try {
                    const errorData = await response.json();
                    if (errorData.is_private) {
                        setIsPrivateRecipe(true);
                    } else {
                        setError('Access denied');
                    }
                } catch {
                    setError('Access denied');
                }
            } else {
                setError('Failed to load recipe');
            }
        } catch (error) {
            console.error('Error fetching recipe:', error);
            setError('Error loading recipe. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const isRecipeOwner = () => {
        return currentUser && recipe && currentUser.user_id === recipe.author?.user_id;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return '';
        }
    };

    const renderIngredient = (ingredient, index) => {
        const { quantity, unit, ingredient: name } = ingredient;
        return (
            <li key={index} className="recipe-list-item recipe-ingredient-item">
                <span className="ingredient-index">{index + 1}</span>
                <div className="flex-grow-1">
                    {quantity && (
                        <span className="recipe-qty me-2">
                            {quantity} {unit && unit}
                        </span>
                    )}
                    <span>{name}</span>
                </div>
            </li>
        );
    };

    const renderInstruction = (instruction, index) => {
        return (
            <li key={index} className="recipe-list-item instruction-step">
                <div className="step-number">{index + 1}</div>
                <div className="flex-grow-1">
                    <p className="mb-0">{instruction}</p>
                </div>
            </li>
        );
    };

    if (loading) {
        return (
            <div className="container py-5">
                <div className="text-center">
                    <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3 text-muted">Loading recipe...</p>
                </div>
            </div>
        );
    }

    // Show private recipe notice if recipe is private and user is not the owner
    if (isPrivateRecipe) {
        return <PrivateRecipeNotice isUncertain={false} />;
    }

    if (error) {
        return (
            <div className="container py-5">
                <div className="text-center">
                    <div className="alert alert-danger" role="alert">
                        <h4 className="alert-heading">Oops!</h4>
                        <p>{error}</p>
                        <hr />
                        <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => navigate('/')}
                            >
                                <ArrowLeft size={16} className="me-1" />
                                Go Home
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => fetchRecipe()}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!recipe) {
        return null;
    }

    // Helper function to get the image to display
    const getDisplayImage = () => {
        if (!recipe?.images || recipe.images.length === 0) {
            return null;
        }

        // Try to get the selected image first
        if (selectedImageIndex >= 0 && selectedImageIndex < recipe.images.length) {
            return recipe.images[selectedImageIndex];
        }

        // Fallback to primary image
        const primaryImage = recipe.images.find(img => img.is_primary);
        if (primaryImage) {
            return primaryImage;
        }

        // Fallback to first image
        return recipe.images[0];
    };

    const displayImage = getDisplayImage();
    const ingredientCount = recipe.ingredients?.length || 0;
    const instructionCount = recipe.instructions?.length || 0;

    return (
        <div className="recipe-page py-4 py-lg-5">
            <div className="container recipe-page-shell">
                <div className="recipe-toolbar card border-0 shadow-sm mb-3">
                    <div className="card-body p-2 p-md-3 d-flex flex-column flex-md-row justify-content-between gap-2">
                        <div className="d-flex flex-wrap gap-2">
                            <Link to="/all-recipes" className="btn btn-outline-primary btn-sm">
                                <ArrowLeft size={14} className="me-1" />
                                Back to All Recipes
                            </Link>
                            {isRecipeOwner() ? (
                                <Link to={`/recipe/modify/${id}`} className="btn btn-warning btn-sm">
                                    <Edit size={14} className="me-1" />
                                    Modify Recipe
                                </Link>
                            ) : (
                                <Link to="/" className="btn btn-outline-secondary btn-sm">
                                    Home
                                </Link>
                            )}
                        </div>

                        <div className="d-flex flex-wrap gap-2 justify-content-md-end">
                            {token && (
                                <button
                                    onClick={() => setShowCollectionModal(true)}
                                    className="btn btn-outline-primary btn-sm"
                                    title="Add to collection"
                                >
                                    <Bookmark size={14} className="me-1" />
                                    Add to Collection
                                </button>
                            )}

                            <button
                                onClick={handleShare}
                                className="btn btn-outline-secondary btn-sm"
                                title="Share this recipe"
                            >
                                <Share2 size={14} className="me-1" />
                                Share
                            </button>
                        </div>
                    </div>
                </div>

                <section className="recipe-hero card border-0 shadow-sm mb-4">
                    <div className="card-body p-3 p-lg-4">
                        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3 mb-3">
                            <div className="flex-grow-1">
                                <p className="small text-uppercase text-muted fw-semibold mb-1">Recipe</p>
                                <h1 className="h2 fw-bold mb-2">{recipe.title}</h1>
                                {recipe.description ? (
                                    <p className="recipe-description mb-0">{recipe.description}</p>
                                ) : (
                                    <p className="recipe-description text-muted fst-italic mb-0">No description provided for this recipe.</p>
                                )}
                            </div>

                            <div className="recipe-like-wrapper">
                                <LikeButton
                                    recipeId={recipe.recipe_id}
                                    initialLikeCount={recipe.like_count || 0}
                                    initialIsLiked={recipe.is_liked_by_user || false}
                                    size="medium"
                                    className="recipe-like-btn"
                                />
                            </div>
                        </div>

                        <div className="d-flex flex-wrap gap-2 mb-3">
                            {recipe.created_at && (
                                <span className="recipe-meta-chip">
                                    <Calendar size={14} className="me-1" />
                                    Created {formatDate(recipe.created_at)}
                                </span>
                            )}
                            <span className="recipe-meta-chip">
                                <Users size={14} className="me-1" />
                                {ingredientCount} ingredients
                            </span>
                            <span className="recipe-meta-chip">
                                <Clock size={14} className="me-1" />
                                {instructionCount} steps
                            </span>
                        </div>

                        {recipe.author && (
                            <div className="recipe-author d-inline-flex align-items-center">
                                {recipe.author.cloudinary_url ? (
                                    <img
                                        src={recipe.author.cloudinary_url}
                                        alt={recipe.author.full_name}
                                        className="recipe-author-avatar rounded-circle"
                                    />
                                ) : (
                                    <div className="recipe-author-avatar rounded-circle bg-primary d-flex align-items-center justify-content-center text-white">
                                        <User size={18} />
                                    </div>
                                )}
                                <div className="ms-2">
                                    <p className="mb-0 fw-semibold">{recipe.author.full_name}</p>
                                    <small className="text-muted">@{recipe.author.username}</small>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {recipe.images && recipe.images.length > 0 ? (
                    <section className="recipe-media card border-0 shadow-sm mb-4 overflow-hidden">
                        <div className="card-body p-0">
                            <div className="position-relative">
                                {displayImage && displayImage.url ? (
                                    <img
                                        src={displayImage.url}
                                        alt={recipe.title}
                                        className="img-fluid w-100 recipe-main-image"
                                        onError={(e) => {
                                            console.error('Main image failed to load:', e.target.src);
                                            e.target.style.display = 'none';
                                            e.target.nextElementSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}

                                <div className="d-none align-items-center justify-content-center recipe-main-image">
                                    <div className="text-center">
                                        <Camera size={40} className="text-muted mb-2" />
                                        <p className="text-muted mb-0">Image failed to load</p>
                                    </div>
                                </div>

                                {(!displayImage || !displayImage.url) && (
                                    <div className="d-flex align-items-center justify-content-center recipe-main-image">
                                        <div className="text-center">
                                            <Camera size={40} className="text-muted mb-2" />
                                            <p className="text-muted mb-0">Image not available</p>
                                        </div>
                                    </div>
                                )}

                                {recipe.images.length > 1 && (
                                    <span className="badge recipe-image-counter position-absolute bottom-0 end-0 m-3 px-2 py-1">
                                        <Camera size={14} className="me-1" />
                                        {selectedImageIndex + 1} / {recipe.images.length}
                                    </span>
                                )}
                            </div>

                            {recipe.images.length > 1 && (
                                <div className="recipe-thumbnails p-3">
                                    <div className="d-flex flex-wrap gap-2">
                                        {recipe.images.map((image, index) => (
                                            <button
                                                key={image.id}
                                                className={`recipe-thumbnail btn p-0 ${index === selectedImageIndex ? 'active' : ''}`}
                                                onClick={() => setSelectedImageIndex(index)}
                                                title={`Show image ${index + 1}`}
                                            >
                                                <img
                                                    src={image.url}
                                                    alt={`${recipe.title} - image ${index + 1}`}
                                                    className="img-thumbnail w-100 h-100"
                                                    style={{ objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        console.error('Thumbnail failed to load:', e.target.src);
                                                        e.target.style.opacity = '0.5';
                                                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1nPC90ZXh0Pjwvc3ZnPg==';
                                                    }}
                                                />
                                                {image.is_primary && <span className="recipe-primary-image">Primary</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                ) : (
                    <section className="card border-0 shadow-sm recipe-empty-state mb-4">
                        <div className="card-body text-center py-5">
                            <Camera size={40} className="text-muted mb-2" />
                            <h5 className="text-muted mb-1">No images available</h5>
                            <p className="text-muted mb-0">This recipe does not have any images yet.</p>
                        </div>
                    </section>
                )}

                <div className="row g-3 mb-4">
                    <div className="col-lg-5">
                        <section className="recipe-panel card border-0 shadow-sm h-100">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h2 className="h6 mb-0 d-flex align-items-center">
                                    <Users className="me-2 text-primary" size={18} />
                                    Ingredients
                                </h2>
                                <span className="badge rounded-pill text-bg-light border">{ingredientCount}</span>
                            </div>
                            <div className="card-body">
                                {ingredientCount > 0 ? (
                                    <ul className="list-unstyled mb-0 d-grid gap-2">
                                        {recipe.ingredients.map((ingredient, index) => renderIngredient(ingredient, index))}
                                    </ul>
                                ) : (
                                    <div className="text-center py-4">
                                        <Users size={36} className="text-muted mb-2" />
                                        <h6 className="text-muted mb-1">No ingredients available</h6>
                                        <p className="text-muted mb-0 small">No ingredients listed for this recipe.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="col-lg-7">
                        <section className="recipe-panel card border-0 shadow-sm h-100">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h2 className="h6 mb-0 d-flex align-items-center">
                                    <ChefHat className="me-2 text-primary" size={18} />
                                    Instructions
                                </h2>
                                <span className="badge rounded-pill text-bg-light border">{instructionCount}</span>
                            </div>
                            <div className="card-body">
                                {instructionCount > 0 ? (
                                    <ol className="list-unstyled mb-0 d-grid gap-2">
                                        {recipe.instructions.map((instruction, index) => renderInstruction(instruction, index))}
                                    </ol>
                                ) : (
                                    <div className="text-center py-4">
                                        <ChefHat size={36} className="text-muted mb-2" />
                                        <h6 className="text-muted mb-1">No instructions available</h6>
                                        <p className="text-muted mb-0 small">This recipe does not have cooking instructions yet.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                <section className="recipe-comments card border-0 shadow-sm">
                    <div className="card-body p-3 p-lg-4">
                        <CommentSection
                            recipeId={parseInt(id, 10)}
                            currentUser={currentUser}
                            isRecipeOwner={isRecipeOwner()}
                        />
                    </div>
                </section>

                <AddToCollectionModal
                    recipeId={parseInt(id, 10)}
                    recipeName={recipe?.title || 'Recipe'}
                    show={showCollectionModal}
                    onClose={() => setShowCollectionModal(false)}
                />
            </div>
        </div>
    );
};
