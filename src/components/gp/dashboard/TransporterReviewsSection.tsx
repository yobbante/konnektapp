import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageCircle, ChevronDown, ChevronUp, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string;
}

interface TransporterReviewsSectionProps {
  gpId: string;
  totalReviews: number;
  rating: number;
}

export function TransporterReviewsSection({ gpId, totalReviews, rating }: TransporterReviewsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReviews = async () => {
    if (reviews.length > 0) return; // Already loaded
    
    setLoading(true);
    try {
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          client_id
        `)
        .eq("gp_id", gpId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (reviewsData && reviewsData.length > 0) {
        // Get client names
        const clientIds = reviewsData.map(r => r.client_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", clientIds);

        const reviewsWithNames = reviewsData.map(review => ({
          ...review,
          client_name: profiles?.find(p => p.user_id === review.client_id)?.full_name || "Client"
        }));
        setReviews(reviewsWithNames);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      loadReviews();
    }
    setIsOpen(!isOpen);
  };

  const renderStars = (starRating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < starRating) {
        stars.push(<Star key={i} className="w-3 h-3 text-warning fill-warning" />);
      } else {
        stars.push(<Star key={i} className="w-3 h-3 text-muted-foreground/30" />);
      }
    }
    return stars;
  };

  return (
    <div className="space-y-2">
      {/* Toggle Button */}
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span>Voir les avis</span>
          <Badge variant="secondary" className="ml-2">
            {totalReviews}
          </Badge>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      {/* Reviews Section */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card>
              <CardContent className="pt-4">
                {/* Summary */}
                <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
                  <div className="flex items-center gap-1">
                    {renderStars(Math.round(rating))}
                  </div>
                  <span className="font-bold text-lg">{rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({totalReviews} avis)
                  </span>
                </div>

                {loading ? (
                  <div className="py-8 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="py-6 text-center">
                    <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun avis pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {reviews.map((review, index) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="pb-4 border-b border-border last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-sm">{review.client_name}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground pl-10">{review.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 pl-10">
                          {new Date(review.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
